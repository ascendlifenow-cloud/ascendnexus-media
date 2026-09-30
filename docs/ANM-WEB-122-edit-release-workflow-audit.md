# ANM-WEB-122 Edit Release Workflow Audit

## Current Structure

The Edit Release workflow lived primarily in `src/admin/pages/AdminReleaseFormPage.tsx`.

Before this update the page rendered:

- A generic `AdminPageHeader` with a mock status flag.
- The release validation summary.
- The full `AdminReleaseForm`.
- A right column containing `PublishingStatusPanel`, `ReleasePublishReadinessPanel`, `ReleasePublishActionButtons`, and `AdminReleaseFormPreviewPanel`.
- A separate sticky bottom `AdminReleaseFormActions` bar with overlapping save, publish, archive, preview, and cancel controls.

## Findings

- Published status was not in the primary release header row.
- Publish readiness and preview were visible as static right-column cards rather than a controlled workflow panel.
- Save/publish/archive actions existed in more than one place.
- Preview navigation could take the editor away from the current workflow instead of presenting draft preview beside readiness.
- Action state labels existed but were split across separate button components.
- Readiness was already computed from current form values, selected artist, and media assets, so it could be reused safely.
- Existing backend APIs already support update/save, publish/republish, archive/restore, and admin preview without creating duplicate publication services.

## Migration Plan

- Replace the generic header with `EditReleaseHeader`.
- Move status into `ReleasePublishedStatus`.
- Move readiness and preview into `ReleasePublishReadinessDrawer`.
- Use one `ReleaseActionBar` in the drawer for Save Draft, Save Changes, Save & Republish, Archive, Preview Release, and Cancel.
- Centralize display-state mapping in `ReleasePublishedStatusService`.
- Centralize action availability in `ReleaseActionAvailabilityService`.
- Keep the existing backend save/publish/archive routes and existing readiness utilities.
- Preserve form state by leaving `AdminReleaseForm` mounted while the drawer opens and closes.

