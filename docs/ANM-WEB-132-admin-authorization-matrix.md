# ANM-WEB-132 Admin Authorization Matrix

Prompt: ANM-WEB-132
Generated: 2026-08-11T16:38:21.717Z
Environment: development
Decision: SECURITY BLOCKED

| Role | Permissions | Critical Permissions | Launch Security Access |
|---|---:|---:|---|
| super_admin | 164 | 41 | yes |
| admin | 163 | 41 | yes |
| content_manager | 67 | 12 | yes |
| media_manager | 16 | 2 | no |
| publisher | 68 | 14 | yes |
| editor | 58 | 6 | yes |
| viewer | 42 | 6 | yes |
| read_only_admin | 42 | 6 | yes |
| support | 45 | 7 | yes |
| security_admin | 26 | 11 | yes |
| deployment_admin | 26 | 16 | yes |


Admin RBAC remains separate from member entitlements. Consumer membership state is never accepted as an administrative permission.
