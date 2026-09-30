# ANM-WEB-093 Homepage & Site Operations Runbook

## Draft Conflict

If an admin sees stale homepage or site settings, reload the draft before saving. If conflict handling reports a newer version, compare current draft values against the version history and reapply only intentional changes.

## Invalid Section

Check the section type against `HomepageSectionRegistry`. Unsupported section types must be removed or converted to a supported launch type before publishing.

## Missing Linked Content

Featured releases, artist spotlights, and gallery previews must reference public-ready records. Publish or replace the linked record, then rerun readiness.

## Hero Or Brand Asset Failure

Verify the asset exists in the Media Library, processing is complete, and the public-safe URL does not contain private paths, signed query parameters, object/blob URLs, or raw storage paths. Reassign the media and publish a new draft.

## Processing Blocker

Use media processing health and asset detail panels to confirm required derivatives are available. Do not publish configuration that references required media with failed processing.

## Navigation Validation Failure

Internal links must be in the supported public route allowlist. External links must use HTTPS. Remove admin routes and unsafe protocols.

## Footer Link Failure

Disable or fix broken footer links. Legal links should remain public-safe and deterministic.

## Publication Failure

Review readiness blockers first, then inspect server logs for sanitized publication errors. The prior published version remains active until publication succeeds.

## Public Sync Mismatch

Fetch `/api/public/site` and `/api/public/homepage`, then compare site name, navigation, footer, section order, disabled-section filtering, and public-safe URLs. Invalidate caches and republish if the draft is correct but public data is stale.

## Cache Issue

Publication invalidates public site, homepage, search, browse, and metadata caches. If stale content remains, run the public delivery smoke check and verify deployment cache/CDN invalidation settings.

## Rollback

Use the version history endpoint to identify a prior verified version. Rollback reactivates that version and invalidates public caches. Confirm `/api/public/site` and `/api/public/homepage` after rollback.

## Restore

Restoring an archived version should create an editable draft or reactivated version for review. It must not be treated as automatically verified for live publication.

## Theme Issue

Revert to known design-system token values. Arbitrary CSS and scripts are not supported and should be rejected by validation.

## Contact Or Newsletter Mismatch

Newsletter sections must remain disabled unless the signup backend is operational. Public contact settings should expose only intentional public email/text and never provider credentials or notification internals.
