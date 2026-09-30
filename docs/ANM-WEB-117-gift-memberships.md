# ANM-WEB-117 Gift Memberships

Gift memberships allow a purchaser or administrator to create a redeemable membership grant tied to a billing plan.

## Safety

- Redemption codes are hashed at rest.
- Recipient email is hashed when present.
- Gifts expire after the configured window.
- Redeeming a gift creates and activates a subscription through the standard billing and entitlement sync path.

