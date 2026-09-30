# ANM-WEB-116 Member Administration

Member administration centralizes search, identity detail, membership operations, session management, and account status changes.

## Capabilities

- Search by email, display name, username, member ID, membership tier, and account status.
- View a consolidated member profile including identity, membership, engagement, sessions, security signals, audit events, support notes, moderation records, risk, health, and timeline.
- Grant membership tiers through the centralized membership assignment service.
- Revoke memberships through the centralized membership assignment service.
- Change account status through the member identity service.
- Revoke one session or all active member sessions.

## Permissions

- Read-only views require `users.read`, with security-focused routes also allowing `security.read` where configured.
- Mutating operations require `users.manage`.
- Admin RBAC remains separate from member entitlements.

## Auditability

Membership grants, revocations, status changes, support notes, moderation actions, and session revocations are recorded through the existing audit persistence path.

