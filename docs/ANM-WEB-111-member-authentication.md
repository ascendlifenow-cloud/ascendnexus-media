# ANM-WEB-111 Member Authentication

ANM-WEB-111 adds the public member identity system while preserving strict separation from administrative authentication.

## Public Routes

- `/register`
- `/login`
- `/logout`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/account`
- `/account/profile`
- `/account/security`
- `/account/sessions`
- `/account/preferences`
- `/account/delete`

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/password/request`
- `POST /api/auth/password/reset`
- `POST /api/auth/change-password`
- `GET /api/account`
- `PATCH /api/account/profile`
- `PATCH /api/account/preferences`
- `GET /api/account/sessions`
- `DELETE /api/account/sessions/:sessionId`
- `DELETE /api/account`

The member client sends `X-Auth-Scope: member` and uses the `anm_member_session` cookie. Admin auth continues to use the admin cookie and admin-scoped routes.

## Security

The system uses the existing password hashing, rate-limit, request hashing, audit, and security-event patterns. Member password hashes, verification tokens, reset tokens, and session token hashes are never returned publicly.

## Admin Management

Admin routes are protected by existing permissions:

- `GET /api/admin/members`
- `GET /api/admin/members/:memberId`
- `PATCH /api/admin/members/:memberId`
- `GET /api/admin/member-health`

Admin pages:

- `/admin/members`
- `/admin/members/:memberId`
- `/admin/member-health`
- `/admin/member-audit`
- `/admin/member-security`
