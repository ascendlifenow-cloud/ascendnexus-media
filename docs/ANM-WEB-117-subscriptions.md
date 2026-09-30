# ANM-WEB-117 Subscriptions

Subscriptions are member-owned records tied to billing plans and provider references.

## States

- `pending`
- `trial`
- `active`
- `grace`
- `past_due`
- `suspended`
- `canceled`
- `expired`
- `refunded`
- `paused`

## Synchronization

`trial`, `active`, and `grace` subscriptions grant the matching membership tier. `canceled`, `expired`, `refunded`, and `suspended` subscriptions revoke paid access and fall back to Free where policy allows.

## Member Routes

- `/member/billing`
- `/member/subscription`
- `/member/payment-methods`
- `/member/invoices`
- `/member/receipts`
- `/member/cancel`
- `/member/upgrade`
- `/member/downgrade`
- `/member/billing-history`

