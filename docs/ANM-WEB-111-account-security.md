# ANM-WEB-111 Account Security

Member account security includes:

- email verification before login
- login failure tracking
- account lockout after repeated failures
- secure password reset
- password change
- session list
- session revocation
- logout
- account deletion
- audit events
- security events

Security events are stored in the existing security event collection with safe request hashes. Raw passwords, tokens, cookies, and email contents are not logged.

Future MFA readiness remains deferred to the membership entitlement and identity-expansion prompts.
