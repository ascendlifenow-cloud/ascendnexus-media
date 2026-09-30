# ANM-WEB-111 Registration

Member registration accepts email, password, display name, terms acceptance, privacy acceptance, and optional newsletter opt-in.

Flow:

1. Validate email, display name, terms, privacy, and password policy.
2. Normalize email.
3. Reject duplicate active member accounts.
4. Hash password with the existing password service.
5. Create a `PendingVerification` member account.
6. Generate a single-use verification token.
7. Record audit and security events.
8. Return a development verification token only outside staging/production.

Production email delivery is represented by the verification token queue and should be connected to the email provider before live launch.
