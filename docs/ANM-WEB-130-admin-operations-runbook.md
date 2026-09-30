# Admin Operations Runbook

Prompt: ANM-WEB-130
Generated: 2026-08-11T15:35:03.781Z
Decision: ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS

## Verification Commands

```bash
npm run launch:admin-smoke
npm run launch:artist-crud
npm run launch:release-crud
npm run launch:media-operations
npm run launch:admin-publication
npm run launch:admin-export-import
npm run launch:admin-permissions
npm run launch:admin-a11y
npm run launch:admin-browser-health
```

## Recovery Topics

- Admin login fails: run admin auth diagnostics and verify active super admin.
- Sidebar broken: verify AdminNavigationRegistry and route permissions.
- Dashboard count incorrect: rerun admin certification and compare canonical DB counts.
- Artist or release save fails: inspect validation, stale record state, and audit event.
- Slug duplicate: resolve non-deleted draft/published records reserving the slug.
- Media assignment fails: verify picker asset type, publication state, storage object, and owner assignment.
- Public Link returns Song Not Found: verify release slug, publication state, artist link, and public route builder.
- Media Intake offline: restart backend with MEDIA_INTAKE_ENABLED=true or use manual upload fallback.
- Media Review stuck: inspect intake records, assignment review status, and failed operations.
- Processing job stuck: retry nonlaunch job or repair launch-critical media derivative.
- Export/import failure: run export/import health and certification; never execute production import without dry run.
- Permission mismatch: compare frontend route permission with backend route permission.
- Stale conflict: reload latest record and preserve local edits for manual merge.
