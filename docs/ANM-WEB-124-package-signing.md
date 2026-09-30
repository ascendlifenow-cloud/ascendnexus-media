# ANM-WEB-124 Package Signing

Package signing uses Ed25519.

The signature scope includes:
- `manifest.json` digest
- `package.json` digest
- `checksums.sha256` digest
- `packageId`
- `packageVersion`

Signature files:
- `signature/signature.json`
- `signature/package.sig`

The local development key provider stores private signing material under the managed server data directory, not source control. Production should replace this provider with KMS/HSM or an approved secrets boundary while preserving the same service interface.
