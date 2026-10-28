# Song permissions and usage

## Implementation boundary

Consumer authorization uses authoritative member accounts, current membership assignments, active entitlement definitions, scoped grants, content policies and overrides. Administrative RBAC stays separate. Active, verified accounts are required for protected songs. Unknown tiers, malformed rules, inactive accounts, ambiguous assignments and unavailable content fail closed.

Free members with the configured extended-preview capability receive one included full play per eligible song. This does not bypass a protected content requirement or an explicit deny. Full-stream entitlement holders may stream currently permitted songs without an artificial playback quota. Download permission is separate and also requires downloads to be enabled for the song. Tier names alone do not grant actions, and live billing is not enabled by this increment.

The durable member/song ledger counts authorized delivery starts, not completed listens. HEAD, repeated ranges, and authorization refresh do not consume another play. Issuing an unused authorization does not consume a play. Usage is keyed to the stable song ID, so replacing an audio asset does not reset an allowance. Client-reported playback completion is labeled as reported, not independently verified listening.

The gateway rechecks session, account, authorization version, current asset binding, publication, policy, overrides and storage before delivery. Protected delivery is private/no-store. Downloads have a separate limited-use authorization. Refresh revalidates access and is bounded by profile TTL and a one-hour playback episode. Bytes already delivered or buffered cannot be recalled; subsequent requests are denied after access loss. The player clears its source on logout/access loss and polls current usage/access state.

Members can read only their own safe song usage summary. The admin member detail includes bounded song usage rows with delivery counts. Neither response includes private object keys, signed URLs or tokens.

## Verification

Local checks passed: `npm run test:song-permissions`, `npm run test:stripe-billing`, member tier lifecycle tests, database snapshot-change tests, typecheck and production build. Song tests use tiny synthetic bytes, not a real recording or an audition. They cover account states, tiers, scoped grants/denies, first-delivery accounting, ranges, downloads/replay, concurrent Free claims, refresh, downgrade, takedown and safe DTOs. Browser playback and deployed gateway behavior still require staging verification after code deployment.

## Approved staging storage repair, 2026-10-28

A read-only audit found eight selected full-song WAV records with public storage and confirmed HTTP 200 audio responses. The owner explicitly approved moving these eight staging files to private storage and retiring their public copies after verification.

`scripts/repair-staging-full-song-storage.ts` performs a narrowly scoped, resumable maintenance operation, not a general migration. It checks the staging database/bucket/domain, requires exactly eight initial candidates, rejects preview-reference collisions, retains existing asset identities and saves original documents in a private ignored recovery journal. Each server-side copy is verified by matching content length and ETag. Unsigned private delivery must return 403/404. Reference changes use a Mongo transaction with optimistic checks; active matching authorizations/playback sessions are revoked. Only then is the old public object deleted, with origin and public-domain checks. A sanitized administrative audit record is persisted. Public previews and production are outside the repair scope.

All eight completed those checks. Recovery evidence lives in ignored `production/anmx-003/staging-full-song-repair.json`; it contains sensitive original references and must never be committed or shared publicly. Restoration must retain private storage: do not blindly restore old public references. This repair cannot recall previously downloaded bytes. ETag/length matching verifies server-side copy integrity, not an independent audio audition or a newly computed SHA-256 of the file contents.

Read-only audit command:

```sh
node --env-file=.env.migration.local --import tsx scripts/song-permissions-staging-audit.ts --environment=staging
```

The audit evaluates current repository policy against staging records; it is not evidence that this code revision is deployed. Production, real Stripe checkout/webhook behavior and destination publication remain unverified and unchanged.
