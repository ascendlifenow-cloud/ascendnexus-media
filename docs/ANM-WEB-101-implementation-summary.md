# ANM-WEB-101 Implementation Summary

## Findings Resolved

Resolved PRF-020 by replacing no-op/console-only analytics behavior with a consent-aware first-party analytics collection path and explicit provider-disabled launch policy.

## Completed

- Added durable `ConsentPolicyRecord`, `VisitorConsentRecord`, and `AnalyticsEventRecord` models.
- Added consent policy, visitor consent, and analytics event repositories.
- Added consent policy service, preference service, URL sanitization, event catalog, data minimization, and server analytics collection service.
- Added public consent and analytics endpoints.
- Added public consent API client, provider, banner, preference center, and persistent privacy choices button.
- Gated `AnalyticsService` by consent category.
- Sanitized page views, search events, audio-preview events, CTA/external-link events, gallery events, and contact/newsletter conversion events.
- Added `npm run analytics:verify` and related analytics/consent script aliases.
- Updated launch checklist.

## Verification

Passed:

```bash
npm run typecheck
npm run analytics:verify
```

`analytics:verify` required elevated execution because the sandbox blocked binding `127.0.0.1`. The approved rerun passed.

Verified behavior:

- Consent policy served.
- GPC detected.
- Optional analytics rejected before consent.
- Consent persisted with server-controlled fields.
- Sanitized analytics accepted after consent.
- Unknown events rejected.
- Withdrawal blocks future optional events.
- Unsafe form/query/audio/private properties are excluded.

## Known Limitations

- Third-party provider verification remains pending until staging selects provider IDs and CSP allowlists.
- Full admin analytics dashboard charts/exports are not yet implemented.
- Browser network inspection, responsive screenshots, and accessibility audit remain staging E2E gates for ANM-WEB-102+.
