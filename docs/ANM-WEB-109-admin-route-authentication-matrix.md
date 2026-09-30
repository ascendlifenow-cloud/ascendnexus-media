# ANM-WEB-109 Admin Route Authentication Matrix

## Summary

Administrative API routes are protected through `mediaAuthorizationService.authenticate()` and controller-level permission checks. Authentication ultimately resolves server-side sessions through `AuthenticationService`.

## Auth Routes

| Route | Method | Authentication | Permission | Notes |
| --- | --- | --- | --- | --- |
| `/api/auth/admin/login` | POST | Signed out | `admin.access` checked after credential verification | Canonical login route |
| `/api/admin/auth/login` | POST | Signed out | `admin.access` checked after credential verification | Legacy compatibility |
| `/api/auth/session` | GET | Required | `admin.access` checked during session hydration | Canonical session route |
| `/api/auth/logout` | POST | Best effort current session | Current session revoked when present | Canonical logout |
| `/api/auth/admin/activate` | POST | Activation token | Pending invited admin only | Single-use hashed setup token |
| `/api/auth/admin/password-reset/request` | POST | Neutral public response | Eligible active admin only | No account enumeration |
| `/api/auth/admin/password-reset/complete` | POST | Reset token | Active eligible admin only | Single-use hashed token |
| `/api/admin/auth/health` | GET | Required | `security.read` or `users.manage` | Detailed diagnostics protected |

## Admin Content APIs

| Area | Route Prefix | Protection |
| --- | --- | --- |
| Users | `/api/admin/users` | Session plus users permissions |
| Artists | `/api/admin/artists` | Session plus artists permissions |
| Releases | `/api/admin/releases` | Session plus releases permissions |
| Media | `/api/admin/media` | Session plus media permissions |
| Gallery | `/api/admin/gallery` | Session plus gallery permissions |
| Homepage/site settings | `/api/admin/homepage`, `/api/admin/site-settings` | Session plus homepage/site settings permissions |
| Metadata/SEO | `/api/admin/metadata`, `/api/admin/seo` | Session plus metadata/SEO permissions |
| Operations | `/api/admin/operations` | Session plus operations permissions |
| Distribution | `/api/admin/distribution` | Session plus distribution/platform permissions |
| Intelligence | `/api/admin/intelligence` | Session plus intelligence permissions |
| Observability/deployment/security | `/api/admin/observability`, `/api/admin/deployment`, `/api/admin/security` | Session plus high-risk system permissions |

Any administrative route missing a backend permission check remains a launch blocker and must be caught by `npm run admin:authz-test` plus route-level smoke tests.
