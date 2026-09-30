# ANM-WEB-101 Production Analytics, Consent & Privacy Controls

## Architecture Decision

Ascend Nexus Media now uses a first-party, consent-aware analytics spine. The public client never calls provider SDKs directly. All analytics actions go through `AnalyticsService`, which checks the active consent record, sanitizes route and property data, and forwards approved events to `/api/public/analytics/events`.

The launch provider remains `none` unless production runtime configuration enables a reviewed provider. This keeps the system operational and verifiable without loading optional third-party scripts before consent.

## Consent Model

The active public consent policy is served from `ConsentPolicyService`. A durable default policy is available when no database policy is published.

Categories:

- `necessary`: required for security, form abuse prevention, and privacy preference storage.
- `analytics`: optional page, content, search, audio-preview, CTA, and form conversion measurement.
- `functional`: optional public-site enhancements.
- `marketing`: disabled by default and reserved for legal-reviewed integrations.

Visitor choices are persisted in `VisitorConsentRecord` with server-controlled timestamps, policy version, GPC/DNT application flags, and expiration.

## Public Endpoints

- `GET /api/public/consent/policy`
- `GET /api/public/consent/availability`
- `POST /api/public/consent`
- `POST /api/public/consent/withdraw`
- `POST /api/public/analytics/events`

Responses avoid token/session/private-field names so the public response safety scanner can enforce no private leakage.

## Public Client

`PublicConsentProvider` loads policy and availability, resolves the stored browser copy, applies GPC/DNT opt-out behavior, and keeps `AnalyticsService` updated.

Public controls:

- `PublicConsentBanner`
- `PublicConsentPreferenceCenter`
- `PublicPrivacyChoicesButton`

Visitors can accept all, reject optional, customize categories, and withdraw optional consent later.

## Event Catalog

Allowed launch events include page views, navigation/CTA/external clicks, artist/release/gallery views, audio-preview events, sanitized search/browse events, contact/newsletter conversion events, consent events, public-client errors, and web-vitals readiness.

Unknown event names are rejected. Event properties are allowlisted per event name.

## Data Minimization

The backend removes or rejects unsafe properties. Forbidden analytics data includes email, phone, form messages, tokens, signed URLs, storage paths, full-song references, private media references, admin notes, and raw IP storage.

Search events record query length and result counts, not raw queries. Page views strip query strings by default and tokenized routes are sanitized.

## GPC and DNT

Launch policy is `global_strict`. If GPC or DNT is detected, analytics and marketing categories are forced off. Visitors may still keep necessary storage.

## Storage and Withdrawal

The browser stores a convenience copy of the active consent record and a first-party policy-version cookie. The server consent record remains authoritative. Withdrawal disables future optional dispatch and stores a withdrawn state.

## Health and Verification

`ServerAnalyticsService.getHealth()` reports policy readiness, provider configuration, first-party collection availability, retention readiness, and recent event counts.

Verification command:

```bash
npm run analytics:verify
```

The verifier checks policy delivery, GPC detection, pre-consent rejection, consent save, accepted sanitized events, unknown-event rejection, withdrawal, and unsafe payload exclusion.

## Known Limitations

- Third-party provider adapters remain disabled until staging/legal review selects and configures a provider.
- Admin analytics dashboard aggregation is represented by backend health and stored event readiness; full charts/exports remain a later observability/admin reporting enhancement.
- Network-level browser inspection and accessibility audit require staging E2E.
