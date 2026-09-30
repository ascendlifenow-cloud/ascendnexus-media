# ANM-WEB-124 Streaming Package Format

Package Version 2 uses `.anmexport` with an internal TAR archive.

Entries:
- `manifest.json`
- `package.json`
- `records/*.ndjson`
- `assets/<category>/<assetId>/<filename>`
- `reports/export-summary.json`
- `reports/validation-report.json`
- `checksums.sha256`
- `signature/signature.json`
- `signature/package.sig`

Binary media is never embedded as base64 JSON in new V2 packages. Records contain metadata and stable asset references only. The archive adapter validates relative paths, rejects traversal, rejects duplicate entries, and writes binary media as separate archive entries.

Encrypted packages use an authenticated AES-256-GCM container around the TAR payload.
