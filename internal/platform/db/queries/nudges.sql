-- name: ListFollowUpCandidates :many
-- Active applications, for users with notifications enabled, whose last activity
-- falls inside the recency window (bounds the scan to an index range rather than
-- the whole table, and keeps a first deploy from detonating the entire historical
-- backlog as nudges). Returns the raw ingredients for silence.StateFor —
-- the silence verdict itself is a Go-side decision, not a SQL one, same as every
-- other silence-state reader in this codebase.
SELECT a.user_id, a.job_id, a.stage,
       GREATEST(a.applied_at, mail.newest_mail_at)::timestamptz AS last_activity_at,
       COALESCE(mail.suggestion_pending, false)::boolean AS has_pending_suggestion
FROM applications a
JOIN notification_settings ns ON ns.user_id = a.user_id AND ns.enabled
JOIN jobs j ON j.id = a.job_id AND j.closed_at IS NULL
LEFT JOIN LATERAL (
    SELECT max(e.received_at) FILTER (WHERE e.job_id = a.job_id)                  AS newest_mail_at,
           bool_or(e.suggested_job_id = a.job_id AND e.application_id IS NULL)    AS suggestion_pending
      FROM emails e
     WHERE e.user_id = a.user_id
       AND (e.job_id = a.job_id OR e.suggested_job_id = a.job_id)
       AND e.deleted_at IS NULL
) mail ON true
WHERE a.applied_at IS NOT NULL
  AND GREATEST(a.applied_at, mail.newest_mail_at)
      > now() - make_interval(days => sqlc.arg(window_days)::int);

-- name: ListInterviewPrepCandidates :many
-- stage_set events that moved an application into `interview`, for users with
-- notifications enabled, bounded to a recency window on occurred_at for the same
-- first-deploy reason as ListFollowUpCandidates. Retracted events are excluded —
-- a correction to the wrong employer never happened for nudge purposes either.
SELECT ev.user_id, ev.job_id, ev.occurred_at
FROM application_events ev
JOIN notification_settings ns ON ns.user_id = ev.user_id AND ns.enabled
WHERE ev.kind = 'stage_set'
  AND ev.signal = 'interview'
  AND ev.retracted_at IS NULL
  AND ev.job_id IS NOT NULL
  AND ev.occurred_at > now() - make_interval(days => sqlc.arg(window_days)::int);

-- name: SettleClosedApplications :one
-- Settle every active tracked application whose listing closed, regardless of
-- notification settings, application date, or closure age. The update guard is
-- rechecked under the row lock, preserving outcomes set concurrently by a user.
-- Lock matching jobs first so a concurrent reopen cannot leave a stale closure.
-- Events and notification records commit with the transition. Only notifications
-- have a recency window, so repairing old tracker entries does not flood inboxes.
WITH locked AS (
    SELECT j.id, j.closed_at
    FROM jobs j
    WHERE j.closed_at IS NOT NULL
      AND EXISTS (
          SELECT 1 FROM applications a
          WHERE a.job_id = j.id
            AND (a.stage IN ('preparing', 'applied', 'screening', 'responded', 'interview', 'offer')
                 OR (a.stage IS NULL AND a.applied_at IS NOT NULL)))
    ORDER BY j.id
    FOR UPDATE OF j
), expired AS (
    UPDATE applications a
    SET stage = 'expired'
    FROM locked j
    WHERE j.id = a.job_id
      AND (a.stage IN ('preparing', 'applied', 'screening', 'responded', 'interview', 'offer')
           OR (a.stage IS NULL AND a.applied_at IS NOT NULL))
    RETURNING a.id, a.user_id, a.job_id, a.company_slug, j.closed_at
), events AS (
    INSERT INTO application_events (user_id, application_id, job_id, company_slug, kind, signal, occurred_at, source)
    SELECT user_id, id, job_id, company_slug, 'stage_set', 'expired', now(), 'system'
    FROM expired
), nudges AS (
    INSERT INTO application_nudges (user_id, job_id, kind, episode_key)
    SELECT e.user_id, e.job_id, 'job_closed', e.closed_at
    FROM expired e
    JOIN notification_settings ns ON ns.user_id = e.user_id AND ns.enabled
    WHERE e.closed_at > now() - make_interval(days => sqlc.arg(window_days)::int)
    ON CONFLICT (user_id, job_id, kind, episode_key) DO NOTHING
    RETURNING user_id, job_id, episode_key
)
SELECT count(*) FROM nudges;

-- name: RecordNudge :execrows
-- Record one matched nudge candidate. The unique index on
-- (user_id, job_id, kind, episode_key) makes this idempotent — re-scanning the
-- same unchanged episode is a no-op — so MATCH can freely re-run over the same
-- candidates every pass without ever double-nudging. Returns the affected row
-- count (1 = newly recorded, 0 = already known).
INSERT INTO application_nudges (user_id, job_id, kind, episode_key)
VALUES (sqlc.arg(user_id), sqlc.arg(job_id), sqlc.arg(kind), sqlc.arg(episode_key))
ON CONFLICT (user_id, job_id, kind, episode_key) DO NOTHING;

-- name: ClaimDueNudges :many
-- Lease a batch of pending nudges, oldest first. FOR UPDATE OF n + SKIP LOCKED
-- lets overlapping worker passes take disjoint rows so a nudge fires at most
-- once; the lease predicate reclaims rows whose sender died (stale claimed_at).
-- Delivery happens OUTSIDE this transaction, so no network call is held under a
-- row lock. Mirrors ClaimDueReminders.
WITH claimable AS (
    SELECT n.id
    FROM application_nudges n
    WHERE n.status = 'pending'
      AND n.failed_at IS NULL
      AND (n.claimed_at IS NULL
           OR n.claimed_at < now() - make_interval(secs => sqlc.arg(lease_seconds)::int))
    ORDER BY n.created_at, n.id
    FOR UPDATE OF n SKIP LOCKED
    LIMIT sqlc.arg(batch_size)
), claimed AS (
    UPDATE application_nudges n
    SET claimed_at = now()
    FROM claimable c
    WHERE n.id = c.id
    RETURNING n.id, n.created_at
)
-- Sorted OUTSIDE the UPDATE. The CTE's ORDER BY only picks WHICH rows are claimed;
-- an UPDATE ... RETURNING is not obliged to emit them in that order, and the engine
-- groups the result into one message per (account, kind), listing the jobs in the
-- order it receives them. Mirrors ClaimDueReminders.
SELECT id FROM claimed ORDER BY created_at, id;

-- name: GetNudgeForDelivery :one
-- The re-check-before-send context for one nudge: the job display fields, the
-- user's live notification rule (enabled + channels — re-read live, not
-- snapshotted, so a change between MATCH and DELIVER takes effect immediately),
-- live destinations, the account's live quiet-hours window (timezone +
-- notification_settings' quiet_hours_start/end, checked by
-- internal/application/deliverywindow before send), and the application's CURRENT
-- stage/last-activity/pending-suggestion so the worker can recompute the
-- triggering condition rather than trust what MATCH saw. job_open lets the
-- worker cancel a nudge for a job that has since closed. application_exists
-- distinguishes "no applications row at all" (untracked since MATCH) from "row
-- exists with a NULL stage" — the LEFT JOIN alone leaves stage NULL in both
-- cases, which would otherwise be judged as the active `applied` stage by
-- silence.ThresholdDays.
SELECT n.id, n.user_id, n.job_id, n.kind,
       j.title, j.company, j.public_slug, j.url,
       (j.closed_at IS NULL)::bool AS job_open,
       COALESCE(n.episode_key = j.closed_at, false)::bool AS job_closed_episode_current,
       COALESCE(ns.enabled, false)::bool AS notifications_enabled,
       COALESCE(ns.channels, '{}'::text[]) AS channels,
       ns.quiet_hours_start AS quiet_hours_start,
       ns.quiet_hours_end AS quiet_hours_end,
       a.stage,
       (a.user_id IS NOT NULL)::bool AS application_exists,
       GREATEST(a.applied_at, mail.newest_mail_at)::timestamptz AS last_activity_at,
       COALESCE(mail.suggestion_pending, false)::boolean AS has_pending_suggestion,
       u.email AS account_email,
       u.timezone AS timezone,
       tl.chat_id AS telegram_chat_id,
       EXISTS(SELECT 1 FROM user_push_tokens upt WHERE upt.user_id = n.user_id) AS has_push_device
FROM application_nudges n
JOIN jobs j ON j.id = n.job_id
JOIN users u ON u.id = n.user_id
LEFT JOIN notification_settings ns ON ns.user_id = n.user_id
LEFT JOIN applications a ON a.user_id = n.user_id AND a.job_id = n.job_id
LEFT JOIN telegram_links tl ON tl.user_id = n.user_id
LEFT JOIN LATERAL (
    SELECT max(e.received_at) FILTER (WHERE e.job_id = n.job_id)               AS newest_mail_at,
           bool_or(e.suggested_job_id = n.job_id AND e.application_id IS NULL) AS suggestion_pending
      FROM emails e
     WHERE e.user_id = n.user_id
       AND (e.job_id = n.job_id OR e.suggested_job_id = n.job_id)
       AND e.deleted_at IS NULL
) mail ON true
WHERE n.id = $1;

-- name: MarkNudgeDelivered :execrows
-- Terminal success: flip a fired nudge to delivered so it leaves the pending scan
-- and is never sent again. Guarded on status='pending' for idempotency under a
-- worker retry that already delivered.
UPDATE application_nudges
SET status = 'delivered', delivered_at = now()
WHERE id = $1 AND status = 'pending';

-- name: CancelNudgeAtFire :execrows
-- Lazy cancellation at fire time: the worker's re-check found the triggering
-- condition no longer holds (a reply arrived, the stage moved on, the job closed,
-- or notifications were disabled since MATCH) — cancel instead of sending.
UPDATE application_nudges
SET status = 'cancelled'
WHERE id = $1 AND status = 'pending';
