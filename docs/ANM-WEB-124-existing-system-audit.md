# ANM-WEB-124 Existing System Audit

ANM-WEB-123 provided governed export/import records, package jobs, conservative create-only import, dry-run conflicts, rollback, admin pages, and CLI commands. Its package serializer emitted one JSON `.anmexport` document with base64 media.

Audit findings:
- Package writer: upgraded from JSON/base64 to Package Version 2 TAR by default.
- Legacy reader: retained for Version 1 JSON/base64 compatibility.
- Import inspection: now supports V2 TAR, encrypted containers, checksum verification, and signature verification.
- Checksums: V2 writes deterministic `checksums.sha256` over archive entries.
- Signatures: Ed25519 package signatures are operational.
- Encryption: AES-256-GCM encrypted container is operational.
- Import modes: create-only remains default; merge is additive; replace/restore are permission-gated and require explicit scope/plan.
- Admin pages: export/import pages remain; security, signer, and certification pages added.
- Certification: local evidence can be generated; staging and production-safe evidence remain environment-bound.
