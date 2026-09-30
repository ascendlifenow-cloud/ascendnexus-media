# ANM-WEB-117 Coupons

Coupons support fixed or percentage discounts, one-time or recurring duration readiness, usage limits, expiration, and member restrictions.

## Rules

- Coupon codes are normalized to uppercase.
- Expired, inactive, exhausted, or member-restricted coupons are rejected.
- Coupons do not apply to Free plans.
- Coupon use is incremented during checkout creation.

