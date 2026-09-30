# ANM-WEB-124 Export/Import Security Operations Runbook

Streaming export stalled:
- Check `npm run export:health`.
- Inspect job status in `/admin/exports`.
- Retry export; incomplete final packages are not marked completed.

Signature invalid:
- Run `npm run import:signature-verify -- --package=<path>`.
- Reject the package if invalid, untrusted, or revoked.

Decryption failed:
- Run `npm run import:decrypt-test -- --package=<path>`.
- Verify key provider health and do not retry passphrases excessively.

Archive bomb or traversal blocked:
- Treat as a security event.
- Do not import.

Merge conflict unresolved:
- Run dry run.
- Resolve conflicts explicitly.
- Do not use merge as source-wins overwrite.

Replace or restore blocked:
- Confirm specific permission, reauthentication, explicit scope, restore plan, and rollback reference.

Certification failed:
- Open `/admin/export-import/certification`.
- Review blocking issues.
- Re-run only after evidence gaps are closed.

Emergency signer revocation:
- Disable or rotate signing key.
- Reject packages signed by revoked keys according to policy.
