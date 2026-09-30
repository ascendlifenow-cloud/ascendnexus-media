# ANM-WEB-126 Data Readiness

## Data Stores Audited

The launch blocker service reads the authoritative `JsonDatabase` or Mongo-backed database shape through `jsonDatabase.read()`.

Audited collections include:

- `adminUsers`
- `artistRecords`
- `releaseRecords`
- `mediaAssets`
- `mediaStorageObjects`
- `memberAccounts`
- `emailDeliveryRecords`

## Checks Added

- Active admin presence.
- Published public catalog presence.
- Artist and release slug uniqueness.
- Published release artist references.
- Published release artwork public-safety.
- Full-song public exposure.
- Member identity health.
- Email delivery health.
- Media intake enablement.
- Media storage object linkage.
- Deployment readiness health.

## Data Rules

- Full-song assets must not have public-safe direct URLs.
- Published artwork URLs must be public-safe when present.
- Non-deleted artist and release slugs must be unique.
- Published releases must reference existing artists.
- Launch decisions default to blocked when P0/P1 checks fail.
