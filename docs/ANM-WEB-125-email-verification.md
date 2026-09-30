# ANM-WEB-125 Email Verification

Member registration uses the existing Identity Core token model: opaque verification tokens are hashed at rest, expire after 24 hours, and are single use. Verification activates the account, sets `emailVerified`, and prevents login until verification is complete.

Email delivery records are queued through `EmailDeliveryService` with member verification templates. Resend verification revokes active prior tokens and queues a new verification delivery. The verification page supports missing, invalid, expired, already-used, successful, and resend states through safe user-facing messages.

Production delivery still requires an enabled email provider and worker in the target environment.
