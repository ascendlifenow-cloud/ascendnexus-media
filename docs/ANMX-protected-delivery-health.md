# Protected Delivery Health and Deadline Handling

Date: 2026-11-01 (America/Denver).

## Completed Increment

Protected-delivery health distinguishes configured profiles, origin observations, and unverified deployed playback. It no longer reports gateway readiness, CDN isolation, search isolation, or browser playback merely because implementation code exists. Health reads do not create default profiles. Missing, duplicate, inactive, or unsafe standard profiles are errors. Counts exclude expired or malformed-expiry authorizations and playback sessions.

Administrative overview and health responses remain protected by existing administrative permissions and use private/no-store and noindex headers. No consumer entitlement or administrative permission was granted or changed.

## Operational Observations

The gateway retains at most 100 observations for 15 minutes in one process. Observations include action, GET/HEAD category, stage, outcome status, safe error category and server time. They contain no member identity, email, resource ID, token, signed URL, storage path, request body, IP or device fingerprint. Data resets on process restart, is bounded under load, and is not fleet-wide monitoring or durable audit history.

HEAD and denied requests never count as completed byte responses. Successful stream/download pipelines produce origin-completion observations only; they do not prove that a browser received or played the content. Client disconnects are distinguished from server failures. Short and oversized upstream bodies count as origin failures, not authorization denials. Stalled requests and observed 5xx responses make delivery health unavailable during the retained window.

`endToEndVerified` stays false in this report. A clean configuration and even a successful origin pipeline cannot certify the unresolved deployed playback path. The member ecosystem certification service now blocks protected-media certification until authoritative end-to-end acceptance is available. This increment does not implement acceptance-evidence ingestion or permit a client to set a verified flag.

## Demonstrated Deadline Bug

An isolated gateway regression found that a request deadline during persistence could abort the media source, return after the commit, and leave the HTTP response open. The deadline now immediately emits a sanitized 504 before headers, or destroys a partial response, closes the source and records the timeout. Later finalization cannot rewrite that timeout as success. Already-running database persistence may still finish; a timeout does not prove rollback or refund a delivery-start ledger entry. Usage counts remain server-recorded delivery starts, not completed listens.

This is a demonstrated local response-hang fix, not proof of the cause or resolution of staging's HTML 502.

## Verification

```sh
npm run test:protected-delivery-health
npm run test:song-permissions
npm run typecheck
npm run build
```

Tests use isolated local records, loopback HTTP listeners and synthetic bytes. They cover profile safety, read-only health, expiration counts, bounded/redacted observations, no HEAD false positives, origin-versus-end-to-end distinction, certification blocking, short/oversized bodies, client cancellation/source cleanup and an actual HTTP 504 during delayed persistence. Admin health/overview API checks cover anonymous rejection, insufficient permissions and authorized private/noindex responses. Existing Free allowance, separate downloads, range accounting, account states and revocation tests remain applicable.

## Staging Acceptance

After deployment, open `/admin/protected-content` or its existing health view with an authorized admin session. The Health JSON includes `verificationScope`, `endToEndVerified`, configuration status and single-process observations. An idle process should show unverified delivery, not a green certification. After an approved isolated range test, inspect origin observations separately from the external test result.

The existing staging 502 remains a release blocker until re-tested successfully. Render workspace confirmation is still required before reading its service logs/events. No production checks, live payments, publication, real song audition or real member changes are claimed.
