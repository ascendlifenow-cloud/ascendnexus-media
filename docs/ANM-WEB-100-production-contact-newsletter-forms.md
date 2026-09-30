# ANM-WEB-100 Production Contact, Newsletter & Public Form Delivery

## Architecture

Public forms now use backend APIs, durable records, server-side validation, consent capture, abuse controls, idempotency, secure token hashing, and delivery records. The old delayed static contact configuration and disabled newsletter placeholder are removed from production runtime.

Resolved audit finding: PRF-012.

## Public Endpoints

- `GET /api/public/contact/availability`
- `POST /api/public/contact`
- `GET /api/public/newsletter/availability`
- `POST /api/public/newsletter/subscribe`
- `POST /api/public/newsletter/confirm`
- `POST /api/public/newsletter/unsubscribe`

Public availability responses expose only enabled/operational flags and avoid provider internals.

## Data Models

- `ContactSubmissionRecord`
- `NewsletterSubscriptionRecord`
- `PublicActionTokenRecord`
- `EmailDeliveryRecord`

Accepted contact submissions persist before success is returned. Newsletter requests persist as `pending_confirmation` by default. Confirmation and unsubscribe tokens are random, hashed at rest, single-use, and expire according to policy.

## Validation And Normalization

The backend normalizes names, email addresses, subjects, messages, phone values, and source context. It rejects missing consent, invalid email addresses, short messages, oversized request bodies, non-JSON public submissions, and obvious header/control-character injection.

## Abuse Protection

Launch controls include:

- Accessible-hidden honeypot fields.
- Bounded per-IP and per-email rate buckets.
- Spam signals for honeypot, excessive links, blocked patterns, and submission velocity.
- Idempotency tokens and normalized duplicate-click protection.

Redis-backed rate limiting remains a staging hardening requirement; local verification uses a bounded memory fallback and reports that honestly.

## Email Delivery

Transactional email delivery is represented by durable `EmailDeliveryRecord` records. Provider sending is not faked: if a production provider is not configured, delivery records are marked failed with `EMAIL_PROVIDER_UNAVAILABLE` while the accepted contact/newsletter records remain durable and visible for retry/recovery.

The intended queue is `public-email-delivery`; worker/provider execution and real test-inbox verification must be completed in staging with approved email credentials.

## Newsletter Policy

The production default is double opt-in:

1. Subscribe request creates or updates a pending subscription.
2. A confirmation token is created and hashed at rest.
3. Confirmation consumes the token once and marks the subscription subscribed.
4. Token reuse is rejected safely.
5. Unsubscribe uses a separate secure token and is idempotent.

Suppressed or complained addresses are not casually resubscribed.

## Public Client

`ContactPage` now renders:

- `PublicContactForm`
- `PublicNewsletterSignupForm`
- newsletter confirmation route `/newsletter/confirm`
- unsubscribe route `/newsletter/unsubscribe`

Forms include labels, inline errors, consent, loading/success states, duplicate-submit prevention, character count, and accessible status messages.

## Admin And Health

Admin APIs exist for:

- `GET /api/admin/contact-submissions`
- `GET /api/admin/contact-submissions/:id`
- `PATCH /api/admin/contact-submissions/:id`
- `GET /api/admin/contact-submissions/:id/deliveries`
- `GET /api/admin/newsletter/subscriptions`
- `GET /api/admin/newsletter/subscriptions/:id`
- `GET /api/admin/system/forms`

These routes require backend permissions and return admin-safe records with subscription token hashes stripped from newsletter responses.

## Verification

Use:

- `npm run forms:verify`
- `npm run contact:smoke-test`
- `npm run newsletter:smoke-test`
- `npm run email:health`
- `npm run email:queue-status`

Local verification confirms persistence, consent, validation rejection, honeypot rejection, delivery record creation, newsletter pending state, confirmation, and token reuse rejection.

## Known Limitations

- Real provider email delivery requires staging credentials and test inbox verification.
- BullMQ worker execution for email delivery is represented by durable records and documented queue metadata, but no provider-send worker is started in this local environment.
- CAPTCHA/challenge provider support is reported as disabled until provider secrets/site keys are configured.
- Legal/privacy copy still requires final legal review.
