# ANM-WEB-112 Membership, Entitlements & Access

## Overview

ANM-WEB-112 adds centralized, server-authoritative consumer authorization. Guest, Free, Premium, Supporter, and VIP access is evaluated through membership assignments and entitlement snapshots, while staff and administrator access remains governed by administrative RBAC.

## Models

- `MembershipTierRecord`: immutable tier key, status, public visibility, readiness flags, display metadata.
- `MembershipPlanRecord`: billing readiness only; no fake payment activation.
- `EntitlementDefinitionRecord`: stable entitlement keys and resource/action categories.
- `TierEntitlementGrantRecord`: tier-to-entitlement allow/deny mappings.
- `MemberMembershipAssignmentRecord`: active member tier history and lifecycle.
- `MemberEntitlementGrantRecord`: member-specific grant/deny readiness.
- `AccessOverrideRecord`: emergency/resource/campaign override readiness.
- `ContentAccessPolicyRecord` and `ContentEntitlementRequirementRecord`: content-policy and resource requirement readiness.
- `ProtectedMediaAuthorizationRecord`: short-lived protected stream/download authorization without raw token storage.
- `MemberAccessHistoryRecord`: sampled access history and protected-media decisions.

## Initial Tiers

- `guest`: implicit public/preview access.
- `free`: default member tier assigned on registration.
- `premium`: readiness tier for premium content and full stream authorization.
- `supporter`: readiness tier for supporter/exclusive access.
- `vip`: readiness tier for all initial consumer entitlements.

Internal staff, administrator, and super-administrator boundaries remain RBAC based.

## Evaluation

`AccessPolicyEvaluationService` evaluates:

1. Subject/account status.
2. Resource publication and availability.
3. Embargo and time windows.
4. Authentication requirement.
5. Active membership assignment.
6. Effective entitlements.
7. Required resource entitlements.
8. Safe decision and cache scope.

The default outcome is deny.

## APIs

Public:

- `GET /api/public/membership/tiers`

Member:

- `GET /api/member/access`
- `GET /api/member/access/entitlements`
- `GET /api/member/access/content/:contentType/:contentId`
- `POST /api/member/media/:mediaId/stream-authorize`
- `POST /api/member/media/:mediaId/download-authorize`

Admin:

- `GET /api/admin/membership-tiers`
- `GET /api/admin/membership-plans`
- `GET /api/admin/entitlements`
- `GET /api/admin/tier-entitlements`
- `GET /api/admin/access-policies`
- `GET /api/admin/access-overrides`
- `GET /api/admin/content-access`
- `GET /api/admin/access-health`
- `POST /api/admin/access-simulator`

## Public Safety

Public projections are sanitized by `PublicAccessProjectionService` and verified with `access:public-projection-scan`, `access:full-song-scan`, and `access:private-media-scan`. Protected media authorization responses never include storage paths, permanent signed URLs, source masters, or download permission unless explicitly authorized.

## Frontend

- `/membership` renders tier configuration from the public API.
- Access UI helpers live in `src/components/access/AccessComponents.tsx`.
- Admin access inspection routes live under `/admin/membership-tiers`, `/admin/entitlements`, `/admin/access-policies`, `/admin/access-simulator`, `/admin/access-health`, and related paths.

## Verification

Use:

- `npm run membership:health`
- `npm run membership:tiers-verify`
- `npm run membership:entitlements-verify`
- `npm run access:policies-verify`
- `npm run access:public-projection-scan`
- `npm run access:cache-scan`
- `npm run access:search-scan`
- `npm run access:protected-media-test`
- `npm run access:full-song-scan`
- `npm run access:private-media-scan`

## Billing Handoff

ANM-WEB-112 does not activate paid billing. ANM-WEB-117 will connect plan state, provider subscriptions, invoices, grace periods, and billing-authoritative tier changes.
