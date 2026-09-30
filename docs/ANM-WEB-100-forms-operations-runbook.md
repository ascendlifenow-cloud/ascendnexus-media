# ANM-WEB-100 Forms Operations Runbook

## Contact Form Unavailable

Run `npm run forms:health`. Check `contactOperational`, database availability, and public `/api/public/contact/availability`. If disabled by configuration, update the published site/configuration policy before re-enabling the form.

## Newsletter Unavailable

Run `npm run newsletter:smoke-test`. Confirm `NEWSLETTER_ENABLED` and public availability. Newsletter responses remain neutral to avoid address enumeration.

## Persistence Failure

Accepted submissions must not be lost. If persistence fails, public API returns failure and no success state is shown. Check MongoDB/local JSON write health and disk permissions.

## Notification Delivery Failure

Contact/newsletter records remain durable even when email provider delivery is unavailable. Review `email_delivery_records` and admin delivery panels. Configure the provider, then retry through the future delivery worker/retry command path.

## Provider Not Configured

`EmailDeliveryRecord.status` is `failed` with `EMAIL_PROVIDER_UNAVAILABLE`. This is expected locally. Staging must configure a provider and verify real inbox delivery before launch.

## Spam Surge

Honeypot and rate-limit signals are stored in `spamAssessment`. Review rejected/rate-limited events, tune public limits, and consider enabling a challenge provider if abuse persists.

## Confirmation Email Missing

Check newsletter subscription status and delivery records. Pending subscriptions do not count as subscribed. If provider delivery failed, resend confirmation after provider recovery.

## Expired Or Used Token

Confirmation tokens are single-use and expire. Ask the visitor to request a fresh subscription confirmation. Do not expose token hashes in admin UI.

## Unsubscribe Failure

Run `npm run newsletter:smoke-test` and inspect the subscription. Unsubscribe is token-based and idempotent; already-unsubscribed records should return a safe success message.

## Incorrect Public Availability

Public `/api/public/site`, `/api/public/contact/availability`, and `/api/public/newsletter/availability` should agree. Clear public caches after configuration changes.

## Verification Commands

- `npm run forms:verify`
- `npm run forms:health`
- `npm run contact:smoke-test`
- `npm run newsletter:smoke-test`
- `npm run email:health`
- `npm run email:queue-status`

Staging-only checks: real email provider delivery, test inbox receipt, bounce/complaint webhook simulation, Redis-backed rate limiting, and browser accessibility E2E.
