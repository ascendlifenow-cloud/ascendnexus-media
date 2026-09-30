# ANM-WEB-124 Export/Import Production Certification

Decision: approved with conditions for local development; not final production certified.

Approved locally:
- Package Version 2 TAR exports.
- Separate binary archive entries.
- No base64 media in new exports.
- Checksum generation and verification.
- Ed25519 signing and trusted verification.
- AES-256-GCM encryption/decryption.
- Create-only dry run.
- Additive merge service.
- Guarded replace-selected and restore modes.
- Admin security, signer, and certification pages.

Conditions before final production approval:
- Run staging E2E.
- Run production-safe E2E.
- Swap local key provider for approved production key management.
- Execute large-package memory/performance tests.
- Execute tamper/security tests in CI or staging.
