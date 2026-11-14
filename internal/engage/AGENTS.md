# internal/engage

Reaching the user: notifications on every channel, digests and reminders, referrals, mentorship, community and moderation-adjacent surfaces.

**Layer 7 of 8.**

May import: `platform`, `dict`, `ai`, `identity`, `candidate`, `job`, `application`, `search` — and itself.

Must NOT import: `ingest`, `api`.

`ingest` share this layer, and the ban runs both ways: two blocks that can see each other are one block under two names.

Both directions are enforced. `depguard` in `.golangci.yml` fails on the
offending import line; `internal/platform/arch/layering` holds the same table and
reports the whole graph at once, including imports that exist only in test files.

## Packages

`buddy` `community` `companyfeedback` `discordlink` `emailnotify` `emailprefs` `ga4mp` `mentorship` `messaging` `notify` `processreport` `pushnotify` `referral` `reminder` `report` `slots` `subscription` `telegramnotify` `vote` `webhooknotify`
