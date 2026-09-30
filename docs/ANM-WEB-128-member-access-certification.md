# ANM-WEB-128 Member Access Certification

Certified flows:

- Guest member-session denial
- Guest member-dashboard denial
- Registration with normalized email
- Pending verification state
- Hashed password storage
- Hashed, expiring verification token
- Duplicate email blocking
- Unverified login blocking
- Single-use verification
- Default Free membership assignment
- Login, session cookie, session restore
- Private/no-store member dashboard response
- Own-session list and revocation
- Cross-member session revocation denial
- Password reset token hashing, consumption, session revocation, and reuse denial
- Sensitive endpoint rate limiting
- Logout cookie clear and session invalidation

| Gate | Status | Severity | Detail |
|---|---:|---:|---|
| runtime.local_server | pass | info | Certification API server started on http://127.0.0.1:53278. |
| guest.member_session_denied | pass | info | Guest member session returned 401. |
| guest.member_dashboard_denied | pass | info | Guest dashboard returned 401. |
| guest.admin_denied | pass | info | Guest admin member list returned 401. |
| registration.create_account | pass | info | Registration returned 201. |
| registration.verification_token_created | pass | info | Verification token created for pending account without exposing it in production mode. |
| registration.no_password_echo | pass | info | Registration response does not echo the submitted password. |
| registration.member_persisted | pass | info | Member account persisted with normalized email. |
| registration.pending_verification | pass | info | New member starts PendingVerification and emailVerified=false. |
| registration.password_hashed | pass | info | Member password is hashed and not stored as plaintext. |
| registration.default_tier_field | pass | info | Member account receives Free Member as the initial consumer tier. |
| registration.duplicate_blocked | pass | info | Duplicate registration returned 409. |
| verification.token_hashed | pass | info | Verification token is stored as a hash, not a raw token. |
| verification.token_expiry | pass | info | Verification token has a future expiration. |
| email.verification_queued | pass | info | Verification email delivery record is created. |
| email.provider_delivery | warning | verification_pending | Local provider status is failed; staging/production inbox delivery still requires provider evidence. |
| login.unverified_blocked | pass | info | Unverified login returned 403. |
| verification.link_activates | pass | info | Verification endpoint returned 200. |
| verification.reuse_denied | pass | info | Reused verification token returned 400. |
| verification.member_activated | pass | info | Verification updates account to Active/emailVerified=true. |
| verification.token_consumed | pass | info | Verification token is single-use and marked used. |
| membership.default_free_assignment | pass | info | Verified/registered member has an active default Free membership assignment. |
| login.invalid_credentials_denied | pass | info | Wrong password returned 401. |
| login.invalid_safe_error | pass | info | Invalid credential response does not expose password internals. |
| login.member_success | pass | info | Member login returned 200. |
| login.member_cookie_set | pass | info | Member login sets the member session cookie. |
| login.cookie_flags | pass | info | Member session cookie includes HttpOnly and SameSite. |
| login.redirect_member | pass | info | Member login response redirects to canonical /member portal. |
| login.authorization_summary | pass | info | Session response includes safe Free membership authorization summary. |
| login.no_token_hash_leak | pass | info | Login response does not expose token hashes. |
| session.restore | pass | info | Member session restore returned 200. |
| member.dashboard_loads | pass | info | Member dashboard returned 200. |
| member.dashboard_private_cache | pass | info | Dashboard response uses private/no-store cache headers. |
| member.dashboard_no_protected_url | pass | info | Dashboard response excludes protected URLs/private storage paths. |
| boundary.member_not_admin | pass | info | Member cookie against admin member API returned 401. |
| sessions.list_other | pass | info | Member can list own active sessions with current-session marker. |
| sessions.revoke_own | pass | info | Own session revocation returned 200. |
| sessions.revoked_cookie_denied | pass | info | Revoked session restore returned 401. |
| registration.http | pass | info | Registration returned 201. |
| registration.dev_token | pass | info | Development/test registration returned a one-time verification token for certification. |
| verification.http | pass | info | Email verification returned 200. |
| verification.account_state | pass | info | Verified member account is Active/emailVerified in authoritative storage. |
| sessions.cross_member_revoke_denied | pass | info | Cross-member session revoke returned 404. |
| registration.secondary_member_ready | pass | info | Secondary member created for cross-account boundary certification. |
| password_reset.request | pass | info | Password reset request returned 200. |
| password_reset.token_hashed | pass | info | Password reset token is stored hashed and not raw. |
| password_reset.complete | pass | info | Password reset returned 200. |
| password_reset.reuse_denied | pass | info | Reused reset token returned 400. |
| password_reset.revokes_sessions | pass | info | Old session after password reset returned 401. |
| password_reset.old_password_denied | pass | info | Old password login returned 401. |
| password_reset.new_password_login | pass | info | New password login returned 200. |
| rate_limit.password_reset | pass | info | Sixth password reset request returned 429. |
| rate_limit.verification_resend | pass | info | Sixth verification resend returned 429. |
| admin.login_success | pass | info | Admin login returned 200. |
| admin.cookie_set | pass | info | Admin login sets the admin session cookie. |
| admin.session_restore | pass | info | Admin session restore returned 200. |
| admin.member_management_access | pass | info | Admin member management returned 200. |
| boundary.admin_not_member | pass | info | Admin cookie against member dashboard returned 401. |
| account_status.admin_suspend | pass | info | Admin suspension returned 200. |
| account_status.suspended_access_denied | pass | info | Suspended member dashboard returned 401. |
| logout.success | pass | info | Logout returned 200. |
| logout.clear_cookie | pass | info | Logout clears the member session cookie. |
| logout.session_invalidated | pass | info | Session after logout returned 401. |