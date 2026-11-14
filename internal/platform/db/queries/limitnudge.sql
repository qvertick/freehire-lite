-- Queries for plan-ceiling hits. The limit-nudge feature (internal/engage/limitnudge)
-- that read them was removed with the Job Searcher adaptation; RecordPlanLimitHit below
-- still backs plan.Store.Consume.

-- name: RecordPlanLimitHit :exec
-- Records that a real plan-ceiling refusal happened for (user, feature, day) — any
-- tier, see migration 0178 — deduped by the primary key, so a retried request that
-- hits the same wall again the same day writes nothing further. Called from
-- plan.Store.Consume on every real refusal (not FairUse, not Shadowed); see that
-- file for the distinction.
INSERT INTO plan_limit_hits (user_id, feature, day)
VALUES (sqlc.arg(user_id), sqlc.arg(feature)::text, sqlc.arg(day))
ON CONFLICT (user_id, feature, day) DO NOTHING;
