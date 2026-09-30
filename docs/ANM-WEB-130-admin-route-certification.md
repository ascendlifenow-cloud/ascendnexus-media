# Admin Route Certification

Prompt: ANM-WEB-130
Generated: 2026-08-11T15:35:03.781Z
Decision: ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS

| Requested | Canonical | Area | Permission | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| /admin | /admin/dashboard | Admin Routing | session | pass | Admin index redirects to dashboard. |
| /admin/dashboard | /admin/dashboard | Dashboard | session | pass | Route is registered or has a canonical equivalent. |
| /admin/artists | /admin/artists | Artist Operations | artists.read | pass | Route is registered or has a canonical equivalent. |
| /admin/artists/new | /admin/artists/new | Artist Operations | artists.create | pass | Route is registered or has a canonical equivalent. |
| /admin/artists/:artistId | /admin/artists/:artistId/edit | Artist Operations | artists.update | pass | Edit page is canonical record detail/edit route. |
| /admin/artists/:artistId/edit | /admin/artists/:artistId/edit | Artist Operations | artists.update | pass | Route is registered or has a canonical equivalent. |
| /admin/releases | /admin/releases | Release Operations | releases.read | pass | Route is registered or has a canonical equivalent. |
| /admin/releases/new | /admin/releases/new | Release Operations | releases.create | pass | Route is registered or has a canonical equivalent. |
| /admin/releases/:releaseId | /admin/releases/:releaseId/edit | Release Operations | releases.update | pass | Edit page is canonical record detail/edit route; public link is separate. |
| /admin/releases/:releaseId/edit | /admin/releases/:releaseId/edit | Release Operations | releases.update | pass | Route is registered or has a canonical equivalent. |
| /admin/media-library | /admin/media | Media Operations | media.read | pass | Canonical Media Library route is /admin/media. |
| /admin/media-intake | /admin/media | Media Operations | media.read | pass | Media Intake is surfaced through Media Library/Review plus /api/admin/media/intake/* health. |
| /admin/media-review | /admin/media-review | Media Operations | media.read | pass | Route is registered or has a canonical equivalent. |
| /admin/media-processing | /admin/media/processing | Media Operations | media.processing.read | pass | Canonical route is /admin/media/processing. |
| /admin/exports | /admin/exports | Export Import | exports.read | pass | Route is registered or has a canonical equivalent. |
| /admin/imports | /admin/imports | Export Import | imports.read | pass | Route is registered or has a canonical equivalent. |
| /admin/launch-readiness | /admin/launch-readiness | Admin Routing | launch.certification.read | pass | Route is registered or has a canonical equivalent. |
| /admin/launch-readiness/admin-operations | /admin/launch-readiness/admin-operations | Admin Routing | launch.certification.read | pass | Route is registered or has a canonical equivalent. |
