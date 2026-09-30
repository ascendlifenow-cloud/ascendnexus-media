# ANM-WEB-117 Payment Provider

The payment provider layer is intentionally abstracted from subscription and entitlement logic.

## Initial Provider

Stripe is the selected production provider. The repository records Stripe readiness through `StripeProvider`, checking for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and configured provider price IDs.

## Future Providers

The provider interface supports PayPal, Apple, Google, Amazon, manual billing, and future providers through:

- Checkout session creation
- Webhook verification
- Health reporting

## Webhooks

Webhook events are idempotently recorded with provider event IDs and signature verification state. Controlled test-mode events are accepted for local verification only.

