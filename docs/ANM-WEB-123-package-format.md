# ANM-WEB-123 Package Format

The `.anmexport` package is UTF-8 JSON:

- `manifest`
- `package`
- `records.artists`
- `records.releases`
- `records.mediaAssets`
- `records.mediaAssignments`
- `records.galleries`
- `assets`
- `derivatives`
- `reports.exportSummary`
- `reports.validationReport`
- `checksums`
- `packageChecksum`

Binary assets are embedded as base64 with per-file SHA-256 checksums. This avoids path traversal and symlink handling in the initial package format because no archive entry paths are extracted.
