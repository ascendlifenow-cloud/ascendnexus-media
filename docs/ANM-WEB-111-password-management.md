# ANM-WEB-111 Password Management

Password management uses the existing password policy and hashing service.

Supported flows:

- forgot password
- reset password
- change password
- session revocation after password changes

Reset tokens are single-use, hashed at rest, and expire after one hour. Development and test environments return the raw reset token to support local smoke tests; staging and production must deliver tokens through the email provider.
