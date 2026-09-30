# ANM-WEB-123 Export / Import Architecture

Ascend Nexus Media Web now uses a governed `.anmexport` package for artist, release, and Media Library portability. The package is application-specific JSON with record envelopes, embedded binary payloads, SHA-256 checksums, manifest metadata, compatibility metadata, and validation reports.

The current implementation stores generated packages in private managed local storage under the configured data root. Download requires admin authentication and a short-lived authorization reference. Imported packages are quarantined in private import staging, inspected, checksum-verified, dry-run planned, and only then eligible for execution.

Default import behavior is `create_only` with `import_as_draft`. Published state is represented in exported records but not automatically reactivated. Full-song/private/protected media are preserved as private/protected metadata and are not downgraded to public.

Known limitation: because this repository does not include a ZIP/TAR dependency, the first production slice uses JSON/base64 binary embedding rather than streaming archive entries. This is portable and checksummed, but very large production exports should move to a streaming archive adapter before high-volume backup use.
