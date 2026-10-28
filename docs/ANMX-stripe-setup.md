# Stripe Setup and Verification

Status: integration implemented and tested with isolated SDK-signed fixtures.
Stripe account creation, real sandbox Checkout, staging deployment, and live launch
verification are pending. No account, product, price or charge was created by agents.

## 1. Create the Account

Create your account at https://dashboard.stripe.com/register and verify your email.
Use Stripe's sandbox/test environment for this rollout. Do not enter live API keys
into staging. Completing business onboarding does not authorize this app to charge.
Never paste keys into chat, repository files, frontend variables or screenshots.

## 2. Confirm Plans Before Creating Prices

The repository contains inherited default prices, not newly approved commercial
pricing. Confirm amounts, currency, monthly/annual availability and tax policy first.
Create recurring Prices only for the plans approved for testing. Each Price must
match the application's active plan amount, currency and interval exactly. Only one
quantity-one recurring item is supported. No trial is requested by this integration.
Leave unused price variables empty; their checkout buttons remain unavailable.

Configure the test customer portal with payment-method updates, invoice history
and subscription cancellation. **Disable subscription price/plan changes.** Save
its explicit configuration ID (`bpc_...`); the API checks the configuration before
allowing Checkout and uses that exact configuration for each portal session.

## 3. Backend Configuration

Set these on the **Render staging API service**, not the Cloudflare frontend/media
worker. Do not commit values. The API process creates Checkout and verifies webhooks.

```text
STRIPE_BILLING_ENABLED=false
STRIPE_LIVE_PAYMENTS_ENABLED=false
STRIPE_APP_ORIGIN=https://staging.ascendnexusmedia.com
STRIPE_SECRET_KEY=<Stripe sandbox secret key, sk_test_...>
STRIPE_WEBHOOK_SECRET=<endpoint signing secret, whsec_...>
STRIPE_PORTAL_CONFIGURATION_ID=<test portal configuration, bpc_...>
STRIPE_PRICE_PREMIUM_MONTHLY=<approved test recurring Price ID>
STRIPE_PRICE_PREMIUM_ANNUAL=<optional approved test recurring Price ID>
STRIPE_PRICE_SUPPORTER_MONTHLY=<optional approved test recurring Price ID>
STRIPE_PRICE_SUPPORTER_ANNUAL=<optional approved test recurring Price ID>
STRIPE_PRICE_VIP_MONTHLY=<optional approved test recurring Price ID>
STRIPE_PRICE_VIP_ANNUAL=<optional approved test recurring Price ID>
```

## 4. Register the Test Webhook

Destination URL:
`https://api-staging.ascendnexusmedia.com/api/billing/webhooks/stripe`

Subscribe to snapshot events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.paid`
- `invoice.payment_failed`

Use the signing secret for this endpoint, not a Stripe CLI listener's secret.
Preserve raw body bytes and `Stripe-Signature` through proxies. Do not put the
webhook behind a browser login challenge. API SDK version is pinned by package-lock;
the handler uses current invoice parent and subscription-item period fields. Match
the endpoint API version to the installed SDK before staging verification. This
increment installs Stripe Node SDK 23.0.1, API version `2026-09-30.endive`.

After configuration, enable `STRIPE_BILLING_ENABLED=true` in staging and redeploy
the API. Keep `STRIPE_LIVE_PAYMENTS_ENABLED=false`. Deploy the matching frontend.

## 5. Staging Acceptance

1. Sign in as an isolated verified Free test member and open `/member/billing`.
2. Confirm the test-mode notice and correct amount/currency/interval.
3. Start Checkout. Verify the real Stripe hosted page and no access before payment.
4. Complete a Stripe test payment using Stripe's documented test payment methods.
5. Confirm the webhook is delivered successfully, then refresh membership. The
   browser return URL is not a payment confirmation and never grants access.
6. Repeat webhook delivery: one payment/invoice and no duplicate assignment.
7. Open Stripe Billing; confirm it belongs to the current member. Cancel there.
8. Verify access follows the confirmed cancellation date; cancel-at-period-end
   keeps already-paid access until expiry. Immediate cancellation removes access.
9. Exercise failed payment, unsigned payload, request retry, logout and separate
   member sessions. Verify no cross-account customer portal or access leakage.
10. Confirm an administrator's later membership grant or revocation is preserved
    when another payment event arrives. Billing must not undo an admin override.

## Implemented Boundary

The official Stripe SDK creates hosted subscription Checkout with a stable
idempotency key. A private pending record is persisted first; existing subscriptions
are not locally canceled by starting checkout. Recoverable bound subscriptions block
a second purchase even after the checkout URL expires. Historical Stripe customers
are reused; ambiguous current customer bindings require operator review.

Webhooks verify raw bytes, timestamp and mode, retrieve current provider state and
the specific event invoice when applicable, then atomically commit subscription,
membership, invoice/payment, audit and deduplication receipt. Membership uses only
confirmed paid-through dates from matching invoice lines. New open renewal invoices
do not erase the previously paid period. Terminated or paused provider state cannot
authorize new playback. Material assignment changes revoke existing media artifacts.

The service checks a cloned baseline at commit and serializes its local writes;
failed mutators use detached drafts. Mongo transactions and existing unique event
indexes protect deployed persistence. Local JSON is not a production payment store.
Request throttling is bounded per process; distributed edge/Redis limits and
multi-instance race tests remain launch prerequisites.

## Limitations and Live Launch Blockers

- No real Stripe request or staging test payment has run until the owner configures
  the account. Mock-provider success is not evidence of payment integration in situ.
- Price changes, upgrades/downgrades, coupons, trials and funded gifts are not enabled.
- Stripe refunds are performed in Stripe Dashboard; app refund reconciliation and
  dispute events are not implemented. A refund alone does not cancel a subscription
  or revoke app access. Cancel the subscription and explicitly revoke membership
  through the admin workflow when required. Do not rely on unsupported refund events.
- No automated missed-webhook reconciliation job is implemented. Monitor Stripe
  delivery failures and replay failed events after fixing the cause. Expired paid
  assignments fail closed rather than granting unlimited access.
- Exact Stripe account/price mode and portal configuration must be verified in
  staging. Real multi-instance concurrency, taxes, refund/dispute policy, legal copy
  and customer-support procedures must be approved before enabling live payments.
- Existing dependency audit reports nine vulnerabilities (four moderate, five high)
  during installation; this increment does not resolve the broader repository audit.

Run `npm run test:stripe-billing`, `node --import tsx scripts/member-tier-lifecycle-test.ts`,
`npm run typecheck` and `npm run build`. The Stripe suite uses a temporary database,
official SDK signature fixtures and an isolated HTTP listener, not real provider calls.

Official references: [Checkout subscriptions](https://docs.stripe.com/payments/checkout/build-subscriptions),
[webhook verification](https://docs.stripe.com/webhooks/signature),
[subscription events](https://docs.stripe.com/billing/subscriptions/webhooks).
