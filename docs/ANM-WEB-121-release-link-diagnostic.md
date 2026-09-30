# ANM-WEB-121 Release Link Diagnostic

## Root Cause

Release actions and public-link badges used hardcoded `/songs/${release.slug}` paths. The public release resolver only matched exact slugs. If a record had a missing, stale, or inconsistent slug while other stable identifiers were valid, the public page could render Song Not Found.

## Fix

- Added a canonical admin release route builder.
- Updated release row actions and public-link state to use the route builder.
- Updated published release lookup to match slug, song ID, or release ID.

## Verification Steps

1. Publish a release with a valid slug and open Public from the release table.
2. Open a published release by `/songs/:slug`.
3. Open a published release by `/songs/:songId`.
4. Open a published release by `/songs/:releaseId`.
5. Confirm unpublished or archived releases remain unavailable publicly.

## Notes

The app still supports the existing `/songs/:songSlug` public route. The route builder centralizes link construction without changing the public URL contract.
