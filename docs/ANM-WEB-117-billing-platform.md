# ANM-WEB-117 Billing Platform

The billing platform activates commerce for Ascend Nexus Media membership while preserving the authorization boundary created in ANM-WEB-112. Billing records financial intent and provider state; membership entitlements are synchronized only through the existing membership assignment service.

## Components

- Billing plans for Free, Premium Monthly/Annual, Supporter Monthly/Annual, and VIP Monthly/Annual.
- Provider abstraction with Stripe as the selected production provider and manual/test readiness for safe local verification.
- Member checkout and billing portal APIs.
- Admin billing, subscription, coupon, promotion, gift, refund, revenue, provider, and health APIs.
- Invoices, receipts, payment records, refunds, coupons, promotions, gift memberships, webhook receipts, and revenue snapshots.
- Entitlement synchronization from subscription state to membership tier.

## Security

Raw card data is never stored. Production checkout is expected to use provider-hosted payment collection. Local verification uses controlled test-mode webhook payloads and redacts sensitive fields from output.

