# ANM-WEB-112 Access Operations Runbook

## Member Has Wrong Tier

Check `/admin/members`, `/admin/membership-tiers`, and `/admin/access-health`. Run `npm run membership:assignments-verify`. Use the admin membership grant endpoint/page only with a reason and audit trail.

## Access Unexpectedly Denied

Run the access simulator for the member, resource, action, and current time. Confirm email verification, account status, active assignment, entitlement snapshot, content classification, embargo, and required entitlement.

## Access Unexpectedly Allowed

Run `npm run access:policies-verify`, `npm run access:cache-scan`, and `npm run access:public-projection-scan`. Apply an emergency deny override if protected content is exposed, then purge affected caches and revoke protected media authorizations.

## Protected Media Exposed

Immediately run:

- `npm run access:full-song-scan`
- `npm run access:private-media-scan`
- `npm run access:protected-media-test`

Disable the affected content or apply emergency deny. Preserve evidence and open a security incident.

## Cache Leaked Higher-Tier Content

Purge public and tier cache scopes. Verify no personalized data entered the `public` cache. Run `npm run access:cache-scan`.

## Search Leaked Protected Content

Disable affected search document, reindex after policy update, and run `npm run access:search-scan`. Protected snippets must not expose body text, storage paths, or full-song references.

## Embargo Or Early Access Failed

Confirm server time, `embargoUntil`, `earlyAccessStartsAt`, publication state, and active entitlement. Re-run the simulator for guest, free, premium, supporter, and VIP subjects.

## Downgrade Or Suspension Did Not Revoke Access

Confirm `authorizationVersion` changed, caches invalidated, and active media authorizations were reviewed. Suspend member access if needed and re-run protected media tests.

## Verification Commands

Use the membership/access command suite after any tier, entitlement, policy, projection, cache, search, or media authorization change. Commands redact sensitive values and return non-zero on blockers.
