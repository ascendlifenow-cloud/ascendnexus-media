# ANM-WEB-085 Production Authentication & RBAC

## Summary

ANM-WEB-085 adds the production authentication foundation for the Ascend Nexus Media admin portal.

Implemented capabilities:

- Backend-authoritative admin login.
- Secure `HttpOnly` session cookie flow.
- Strong password hashing with Node `crypto.scrypt`.
- Admin user model with account statuses, lockout fields, roles, and audit-ready metadata.
- Admin session model with hashed opaque tokens, expiration, device labels, and revocation.
- Password reset token model and reset workflow readiness.
- System role and permission catalog.
- Protected admin API routes through `MediaAuthorizationService`.
- Frontend `AdminAuthProvider`, guarded admin routes, login/reset pages, and permission-aware navigation.
- User administration page for listing, creating, disabling, and restoring admin users.

## Security Model

Public site routes remain unauthenticated. Admin routes require an active backend session unless a local development bypass is explicitly enabled outside staging and production.

Session tokens are generated as opaque random secrets, stored only as SHA-256 hashes, and delivered to browsers through an `HttpOnly` cookie. The cookie uses the centralized ANM-WEB-084 auth configuration for name, domain, `Secure`, and `SameSite`.

Passwords are hashed using `crypto.scryptSync` with a per-password random salt. Password policy validation rejects short, placeholder, and identity-matching passwords.

## Local Bootstrap

Initialize role records:

```bash
npm run auth:initialize
```

Bootstrap the first super admin:

```bash
npm run admin:bootstrap -- --email=admin@example.com --password='StrongPassword123!' --displayName='Admin Name'
```

The bootstrap script intentionally does not print passwords.

## Development Bypass

The legacy dev token path remains available only for local development and test runs. It is blocked automatically in staging and production by checking the ANM-WEB-084 deployment environment.

## Remaining Production Notes

This implementation uses the existing JSON-backed persistence layer to match the current app architecture. Production launch still needs the database-backed repository and migration work tracked separately in the launch checklist.
