# ANM-WEB-128 Identity Architecture Audit

Member identity is server-authoritative through `MemberIdentityService`, durable member accounts, hashed member sessions, hashed verification tokens, and hashed password reset tokens.

Administrative authentication remains separate through `AuthenticationService`, admin sessions, admin roles, and admin cookies. Member sessions are not accepted by admin APIs, and admin cookies are not accepted by member portal APIs.

Consumer membership is resolved through membership assignments and effective entitlements. The client receives only a safe authorization summary; it does not supply tier, role, entitlement, or member identity values for access decisions.

Session cookies are HTTP-only and SameSite scoped. Member and admin cookie names are separate. Sensitive routes are certified through real HTTP requests against the application server.

Known production boundary: local certification verifies queue creation for member verification email. Real provider delivery and inbox-link rendering must be certified in staging/production before final production verification.