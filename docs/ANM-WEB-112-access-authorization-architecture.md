# ANM-WEB-112 Access Authorization Architecture

## Decision

Ascend Nexus Media now uses one centralized consumer authorization architecture for public/member access decisions:

- Identity source of truth: ANM-WEB-111 member accounts and sessions.
- Membership-tier source of truth: `MembershipTierRecord` plus `MemberMembershipAssignmentRecord`.
- Entitlement source of truth: `EntitlementDefinitionRecord`, `TierEntitlementGrantRecord`, and `MemberEntitlementGrantRecord`.
- Administrative RBAC boundary: admin permissions remain in ANM-WEB-085/109 and are not merged into consumer entitlements.
- Content-policy source of truth: `ContentAccessPolicyRecord` and `ContentEntitlementRequirementRecord`.
- Access decision service: `AccessPolicyEvaluationService`, default-deny and server authoritative.
- Effective entitlement service: `EffectiveEntitlementService`, deterministic per member/tier snapshot.
- Media-delivery strategy: protected stream/download requests require short-lived `ProtectedMediaAuthorizationRecord` issuance.
- Cache strategy: decisions declare `public`, `guest_teaser`, `member_shared_by_tier`, `member_specific`, or `admin`.
- Search/filtering strategy: public/member projections are validated for protected-field leakage; search safety scans reject private/full-song fields.
- Billing boundary: Premium, Supporter, and VIP tiers exist in readiness mode only. Billing synchronization is intentionally deferred to ANM-WEB-117.

## Failure Behavior

Unknown tiers, unknown entitlements, invalid policies, suspended members, expired assignments, embargoed content, and protected media without an allow decision all fail closed. Public responses expose only safe denial messages.

## Known Limitations

The current implementation provides the server-side engine, protected authorization artifact, public tier API, member access API, admin inspection/simulator console, and verification commands. Deep per-entity access editors and live billing/provider synchronization remain future prompts.
