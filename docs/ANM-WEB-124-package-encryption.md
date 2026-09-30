# ANM-WEB-124 Package Encryption

Package encryption uses AES-256-GCM authenticated encryption.

Current implementation:
- `server_managed_key` mode is operational.
- Encrypted packages contain safe encryption metadata and base64 ciphertext.
- Authentication tags are verified before archive inspection.
- Protected-media and full-backup exports require encryption unless explicitly blocked by policy.

Production hardening path:
- Replace local managed key storage with KMS envelope encryption.
- Add recipient public-key wrapping for portable transfers.
- Add passphrase mode only with approved memory-hard KDF controls.
