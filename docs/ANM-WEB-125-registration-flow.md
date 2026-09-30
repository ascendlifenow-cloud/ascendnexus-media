# ANM-WEB-125 Registration Flow

Registration now marks required and optional fields with text labels, prevents duplicate submission, validates password confirmation, and shows staged operational feedback:

1. Creating Account...
2. Creating Member...
3. Preparing Verification...
4. Account Created

After account creation, the browser redirects to `/login?registered=1`. The login page prompts the member to verify email before signing in. In local development, when the backend exposes a development verification token, the login page includes a verification link for safe local testing.
