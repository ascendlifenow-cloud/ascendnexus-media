# ANM-WEB-101 Analytics & Consent Operations Runbook

## Consent Banner Missing

Run `npm run analytics:verify`. Check `/api/public/consent/policy` and `/api/public/consent/availability`. Confirm the public app is wrapped in `PublicConsentProvider` and `PublicShell` renders `PublicConsentBanner`.

## Banner Reappears Repeatedly

Verify the browser can write first-party storage and the saved record policy version matches the active policy version. Expired or withdrawn records intentionally prompt again.

## Provider Loads Before Consent

Production provider defaults to `none`. If a provider is added, verify it initializes only through the centralized analytics manager after `analytics` consent is true. No page component should import provider SDKs.

## Events Continue After Withdrawal

Run `npm run analytics:verify`; it validates withdrawal blocks future optional events. Inspect `VisitorConsentRecord.status` and confirm the browser copy is updated to `withdrawn`.

## Optional Storage Remains

Use the storage registry notes in the implementation doc. Necessary security storage must remain; optional provider storage should be removed or documented as provider-limited.

## Duplicate Page Views

Check `usePageViewTracking` and `AnalyticsService.lastPageViewKey`. Route tracking strips query strings and deduplicates rerenders for the same public path.

## Form Data Detected

Disable analytics immediately by setting `ANALYTICS_ENABLED=false` or provider `none`. Run `npm run analytics:verify` and inspect stored `analyticsEventRecords`; form event properties must contain only location, variant, result, and error category.

## Tokenized URL Detected

Run the verifier. `AnalyticsUrlSanitizationService` removes sensitive query parameters and converts search `q` into `queryLength`.

## Provider Outage

Provider failures are noncritical. Public interactions continue, and `AnalyticsService` catches provider errors. Check `/api/admin/analytics/health` for degraded configuration state.

## Emergency Analytics Disable

Set:

```bash
ANALYTICS_ENABLED=false
ANALYTICS_PROVIDER=none
```

Rebuild/redeploy runtime config and run `npm run analytics:verify`.

## Verification Commands

```bash
npm run analytics:verify
npm run typecheck
npm run public-api:verify
npm run public-client:verify
npm run build
```
