-- Audience reader for one-off campaigns. The broadcast writer
-- (internal/engage/broadcast) was removed with the Job Searcher adaptation, so this
-- statement is now read only by the SQL-level tests beside it.

-- name: ListBroadcastCandidates :many
-- Everyone who can be mailed and has not received this campaign yet.
--
-- No signup window, unlike the onboarding queries: a campaign is addressed to the
-- whole audience by definition, and the launch it announces matters as much to
-- someone who joined in June as to someone who joined last week. The cap is
-- therefore the only bound on a run, which is why the caller passes it explicitly
-- rather than relying on a default.
--
-- The two exclusions are the same as everywhere else, for the same reasons: an
-- unverified address was never proven to belong to anyone, and an explicit
-- notification_settings.news_email_enabled = false is an opt-out. A missing settings
-- row means the account never touched the setting and still hears from us.
--
-- The gate used to be `enabled`, which also governs the lifecycle nudges — so
-- declining letters from the founder also stopped somebody's application
-- follow-up reminders, and an account with no settings row could not decline at
-- all, because the only thing that creates the row is a page behind the login.
-- Migration 0153 split the two.
SELECT u.id, u.email
FROM users u
LEFT JOIN notification_settings ns ON ns.user_id = u.id
WHERE u.email_verified
  AND COALESCE(ns.news_email_enabled, true)
  AND NOT EXISTS (
      SELECT 1 FROM broadcast_emails be
      WHERE be.user_id = u.id AND be.campaign = sqlc.arg(campaign)
  )
ORDER BY u.created_at
LIMIT sqlc.arg(max_rows)::int;
