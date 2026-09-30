# ANM-WEB-120 Admin Navigation And Media Review Workspace Audit

## Current Structure

The admin shell used `AdminLayout`, `AdminSidebar`, `AdminTopbar`, and a flat `adminNavItems` array. Media Review was available at `/admin/media/review` and rendered a queue plus separate detail/action panels.

## Findings

- Navigation was flat, with Media Library, Media Processing, and Media Review out of the requested workflow order.
- Sidebar had no collapsed icon-rail mode or persisted preference.
- Permission filtering existed, but navigation metadata was not grouped or extensible enough for badges.
- Media Review actions were duplicated between queue cards and the side action panel.
- Review selection was local state only, so direct refresh could not reopen a selected item.
- The detail/action panels were fixed two-column content rather than a sliding review workspace.
- Final operations did not consistently close the review workspace after success.

## Migration Plan

- Add a central grouped navigation registry and keep the legacy `adminNavItems` export as a compatibility wrapper.
- Persist sidebar mode in local storage as a fallback preference source.
- Add Media Review badge readiness from the existing review queue service.
- Add `/admin/media-review` while preserving `/admin/media/review`.
- Replace the old fixed right column with a sliding `MediaReviewPanel`.
- Move review decisions into a shared sticky `AssignmentActionBar`.
- Use query string selection with `?review=<reviewItemId>`.

## Known Gaps

The current media review data source remains the existing frontend Media Assignment Review service layered over Media Library assets. The production backend endpoints described in ANM-WEB-120 remain a follow-up hardening item.
