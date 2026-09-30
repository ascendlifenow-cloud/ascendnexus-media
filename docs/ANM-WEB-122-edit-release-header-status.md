# ANM-WEB-122 Edit Release Header Status

The Edit Release page now uses a single header row:

- Left: release navigation, page title, release title, artist, release date, and saved/unsaved context.
- Right: authoritative published status, timestamp where available, readiness blocker count, and drawer toggle.

Status rendering is centralized in `ReleasePublishedStatusService`.

Supported mapped states include draft, unsaved changes, saved changes, ready to publish, published, published with draft changes, scheduled, republish required, publishing, republishing, archive pending, archived, publication failed, and unavailable.

The component uses text, icon, and badge treatment so the state is not communicated by color alone.

