# ANM-WEB-122 Edit Release Workflow Runbook

## Published Status Incorrect

Run `npm run typecheck`, refresh the release detail query, and compare the release record status, `metadata.publicationState`, `metadata.publishedAt`, and `metadata.republishRequired`.

## Readiness Panel Does Not Open

Open `/admin/releases/:releaseId/edit?panel=publish-readiness`. If direct URL works, inspect the header and readiness buttons. If direct URL fails, check React Router search-param handling.

## Readiness Data Stale

Save the form, reopen the panel, and verify media assets and selected artist data are loaded. The page refreshes release/media queries after successful actions.

## Action Bar Missing

Confirm `ReleasePublishReadinessDrawer` is mounted and `panel=publish-readiness` is present in the URL.

## Save Draft Or Save Changes Fails

Keep the panel open, inspect the validation summary, and verify existing admin release update routes respond successfully.

## Republish Blocked Unexpectedly

Open the Readiness section and inspect missing fields, blocking issues, media public-safety checks, artist status, slug validity, and metadata image safety.

## Panel Closes On Failure

This is a defect. Failed save, publish, archive, stale-record, and validation actions must leave the panel open.

## Panel Does Not Close On Success

Check `completeAction` in `AdminReleaseFormPage.tsx` and ensure the backend mutation result is `ok`.

## Preview Shows Live Rather Than Draft

The drawer preview uses current form state and must be labelled as draft preview. Do not route to public release pages for draft preview.

## Mobile Panel Unusable

Verify the drawer uses full viewport width below the responsive max-width and that sticky action controls remain reachable.

## Verification Commands

- `npm run typecheck`
- `npm run build`
- `npm run test:admin-release-crud`

