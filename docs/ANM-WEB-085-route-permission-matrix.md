# ANM-WEB-085 Route Permission Matrix

| Surface | Route | Permission |
|---|---|---|
| Auth login | `POST /api/admin/auth/login` | Public admin auth endpoint |
| Current session | `GET /api/admin/auth/session` | Active session |
| Logout | `POST /api/admin/auth/logout` | Active session |
| Logout all | `POST /api/admin/auth/logout-all` | Active session |
| Session list | `GET /api/admin/auth/sessions` | Active session |
| Revoke own session | `DELETE /api/admin/auth/sessions/:sessionId` | Active session |
| Change password | `POST /api/admin/auth/change-password` | Active session |
| Password reset request | `POST /api/admin/auth/password-reset/request` | Public admin auth endpoint |
| Password reset complete | `POST /api/admin/auth/password-reset/complete` | Valid reset token |
| Auth health | `GET /api/admin/auth/health` | Operational health endpoint |
| Roles | `GET /api/admin/roles` | `roles.read` |
| Permissions | `GET /api/admin/permissions` | `roles.read` |
| Admin users | `GET /api/admin/users` | `users.read` |
| Create admin user | `POST /api/admin/users` | `users.create` |
| Admin user detail | `GET /api/admin/users/:userId` | `users.read` |
| Update admin user | `PATCH /api/admin/users/:userId` | `users.update`, plus `users.assign_roles` when roles change |
| Disable admin user | `POST /api/admin/users/:userId/disable` | `users.disable` |
| Restore admin user | `POST /api/admin/users/:userId/restore` | `users.restore` |
| Unlock admin user | `POST /api/admin/users/:userId/unlock` | `users.update` |
| Reset user password | `POST /api/admin/users/:userId/password-reset` | `users.reset_password` |
| User sessions | `GET /api/admin/users/:userId/sessions` | `users.read` |
| Revoke user sessions | `POST /api/admin/users/:userId/sessions` | `users.update` |
| System config health | `GET /api/admin/system/configuration/health` | `system.configuration.read` |
| System config validation | `GET /api/admin/system/configuration/validation` | `system.configuration.read` |
| Media library | `/api/admin/media/*` | Existing media permissions through `MediaAuthorizationService` |
| Publication workflow | `/api/admin/publication/*` | Existing publication permissions through `MediaAuthorizationService` |
| Processing workflow | `/api/admin/media/processing/*` | Existing media/processing permissions through `MediaAuthorizationService` |

Frontend admin routes use the same permission names through `RequirePermission`.
