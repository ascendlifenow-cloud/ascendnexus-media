# Member Account Types

Follow-on: the Stripe sandbox integration is now implemented with hosted Checkout,
SDK-verified webhooks and provider-backed customer portal management. Account setup
and real staging payment tests remain pending. See [Stripe setup](ANMX-stripe-setup.md).
The payment-blocker section below records the earlier audit finding.

## Assignment Paths

- Public registration creates a pending-verification account with Free membership.
  Client-supplied tiers and administrative roles are not used by registration.
- Admin Members now offers the active Free, Premium, Supporter and VIP tiers from
  the server catalog instead of a hardcoded Grant Premium action. Select a member,
  select the membership, then Set membership. Changes require `users.manage`.
- Administrative roles remain a separate authorization system; membership never
  grants staff, administrator or super-administrator permissions.
- Subscription synchronization maps internal subscription plans to membership
  assignments. The isolated fixture verifies this mapping, not a live payment.

## Safety

The shared assignment service rejects missing/deleted accounts, guest/staff/unknown
or inactive tiers, invalid expiration dates and non-Free registration assignments.
It replaces existing active/grace/suspended assignments, increments authorization
version, revokes active media authorizations and stops active playback-session
records in the same database update. Client playback cleanup still depends on its
existing access-refresh behavior; downloaded bytes cannot be recalled.

The admin grant endpoint rejects unknown request fields and no longer silently
downgrades to Free when the tier is omitted. Audit events record actor, tier and
assignment source. Account activation/verification remains independent of tier.

## Payment Blocker

Inspection found placeholder Stripe checkout URLs and webhook verification that
accepted any signature, or a client-supplied testMode flag. These paths now fail
closed: neither Stripe nor manual public webhooks can establish payment, and the
Stripe adapter no longer returns a fabricated checkout URL.

Automatic paid upgrades are **not operational**. Before enabling them, implement
real provider checkout, raw-body signature validation, provider subscription/event
mapping, replay-safe processing, cancellation/refund handling and staging payment
tests. Follow [Stripe webhook signature guidance](https://docs.stripe.com/webhooks/signature).
Until verified, use authorized administrative grants; do not describe them as paid.
Existing grants and account data were not migrated or altered by this change.

## Verification

`node --import tsx scripts/member-tier-lifecycle-test.ts` runs only against a fresh
temporary local database. It covers Free defaults, all four admin tiers, invalid
assignments, internal subscription-to-tier mapping, version increments, media
revocation and rejection of unverified payment events. It does not exercise a real
payment provider, create staging accounts or assert browser/production verification.

After staging redeployment, verify the Members selector, a permitted tier change
on an isolated test account, the updated member session and loss of old protected
media access. Do not test changes on real customer accounts without approval.
