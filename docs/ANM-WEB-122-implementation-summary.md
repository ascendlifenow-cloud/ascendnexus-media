# ANM-WEB-122 Implementation Summary

## Implemented

- Replaced the generic Edit Release header with `EditReleaseHeader`.
- Added `ReleasePublishedStatus` in the right side of the header row.
- Added centralized `ReleasePublishedStatusService`.
- Added centralized `ReleaseActionAvailabilityService`.
- Added normalized `ReleaseEditorActionService` result model helpers.
- Added shared `ReleaseActionBar`.
- Added `ReleasePublishReadinessDrawer` sliding in from the right.
- Moved Release Publish Readiness into the drawer.
- Moved Release Preview into the drawer.
- Added publication impact/history-readiness section.
- Added URL state for `?panel=publish-readiness` and `?section=preview`.
- Preserved mounted form state while the panel opens and closes.
- Added stateful labels for save, publish, archive, preview, and cancel actions.
- Successful save, publish, and archive operations refresh release/media state and close the drawer after backend confirmation.
- Failed validation/mutation operations keep the drawer open.
- Removed the duplicate bottom release action bar from the Edit Release page.

## Backend Integration

The implementation reuses the existing admin backend:

- Release create/update routes for Save Draft and Save Changes.
- Existing publish/republish route for Save & Republish.
- Existing archive/restore route for Archive.
- Existing admin preview route and current draft form state for Preview.

No duplicate publication pipeline was introduced.

## Verification

Completed:

- `npm run typecheck`
- `npm run build`
- `npm run test:admin-release-crud`

## Known Limitations

- Permission awareness currently maps to existing authenticated admin access and local action capability flags; granular UI permission hydration can be expanded when the admin session exposes per-route release permissions.
- Backend-specific `/save-draft`, `/save-changes`, and `/save-and-republish` aliases were not duplicated because the existing REST routes already provide the authoritative operations.
- Full stale-record conflict UI remains readiness documented but not fully implemented because current release records do not expose a dedicated draft-version concurrency token in the frontend model.

## Final Decision

ANM-WEB-122 is implemented as a functional workflow refactor with centralized status/action mapping, a right-side readiness/preview drawer, one drawer action bar, backend-confirmed state transitions, and no duplicate release publication pipeline.
