# ANM-WEB-122 Release Action Bar

`ReleaseActionBar` is the single release action surface for the drawer.

Actions:

- Save Draft
- Save Changes
- Save & Republish
- Archive
- Preview Release
- Cancel

Action availability is centralized in `ReleaseActionAvailabilityService` and considers:

- Release lifecycle state.
- Dirty form state.
- Form validity.
- Readiness blockers.
- Active mutation.
- Basic edit/publish/archive/preview permissions.

Disabled actions include accessible title and aria-label reasons.

The bar is sticky at the top of the drawer and remains visible while readiness, preview, and history content scroll.

