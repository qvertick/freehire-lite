-- Candidate readers for the founder signup sequence. The `internal/engage/onboarding`
-- package that drove them was removed with the Job Searcher adaptation, so the two
-- statements that remain are read only by the SQL-level tests beside them; the rules
-- below are why they are worth keeping in that role.
--
-- Three rules hold across both of them, and each is load-bearing:
--
--   * `email_verified` — an unverified address is one nobody proved they own.
--     Mailing it is how a sending domain collects bounces and spam complaints for
--     addresses that were typos to begin with.
--   * The `window_days` bound — without it the first deploy mails the entire
--     historical user table at once. It also caps the blast radius of any future
--     mistake to two weeks of signups.
--   * The LEFT JOIN on notification_settings — a missing row means the account
--     never touched the setting, which is not the same as opting out, so it still
--     gets the sequence. An explicit `news_email_enabled = false` stops it.
--
--     That used to be `enabled`, the same flag the lifecycle nudges read, so
--     declining the founder's letters also stopped somebody's application
--     reminders — and an account with no settings row could not decline either
--     one, because the page that creates the row is behind the login. Migration
--     0153 split them; the unsubscribe link writes this column without a session.

-- name: ListWelcomeCandidates :many
-- Verified accounts inside the window that have not been greeted yet. This is the
-- only step with no waiting period: it goes out on the next pass after signup.
SELECT u.id, u.email
FROM users u
LEFT JOIN notification_settings ns ON ns.user_id = u.id
WHERE u.email_verified
  AND u.created_at > now() - make_interval(days => sqlc.arg(window_days)::int)
  AND COALESCE(ns.news_email_enabled, true)
  AND NOT EXISTS (
      SELECT 1 FROM onboarding_emails oe
      WHERE oe.user_id = u.id AND oe.step = 'welcome'
  )
ORDER BY u.created_at
LIMIT sqlc.arg(max_rows)::int;

-- name: ListBuddiesCandidates :many
-- Greeted a while ago: an introduction to interview buddies. It skips two kinds
-- of account, each of which already knows the feature or has already been pitched it:
--
--   * one with a buddy_members row, active or left — a member, or someone who joined
--     and chose to leave, does not need the feature explained;
--   * one the one-off 'interview-buddies' broadcast already reached — the same pitch
--     twice, once as an announcement and once as a "did you know", reads as nobody
--     keeping track.
--
-- Its window is its own (BuddiesWindowDays), not the shared one: the letter goes out
-- on day 14, which the shared 14-day window never reaches, and widening the shared
-- window would hand every earlier step's query accounts aged 14-21 days that never got
-- those steps — the tailor letter shipped after they aged out, so they would all get it.
SELECT u.id, u.email
FROM users u
JOIN onboarding_emails w ON w.user_id = u.id AND w.step = 'welcome'
LEFT JOIN notification_settings ns ON ns.user_id = u.id
WHERE u.email_verified
  AND u.created_at > now() - make_interval(days => sqlc.arg(window_days)::int)
  AND w.sent_at < now() - make_interval(days => sqlc.arg(after_days)::int)
  AND COALESCE(ns.news_email_enabled, true)
  AND NOT EXISTS (
      SELECT 1 FROM buddy_members bm WHERE bm.user_id = u.id
  )
  AND NOT EXISTS (
      SELECT 1 FROM broadcast_emails be
      WHERE be.user_id = u.id AND be.campaign = 'interview-buddies'
  )
  AND NOT EXISTS (
      SELECT 1 FROM onboarding_emails oe
      WHERE oe.user_id = u.id AND oe.step = 'buddies'
  )
ORDER BY u.created_at
LIMIT sqlc.arg(max_rows)::int;

-- name: RecordOnboardingEmail :exec
-- Closes out one (user, step) whether or not the send worked; `error` carries the
-- transport failure when it did not. ON CONFLICT DO NOTHING makes a double run
-- harmless: the first row stands and the send is never repeated.
INSERT INTO onboarding_emails (user_id, step, error)
VALUES (sqlc.arg(user_id), sqlc.arg(step), sqlc.arg(error))
ON CONFLICT (user_id, step) DO NOTHING;
