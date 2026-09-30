# ANM-WEB-114 Member Portal Operations Runbook

## Verification Commands

- `npm run member-portal:health`
- `npm run member-portal:verify`
- `npm run member-portal:dashboard-test`
- `npm run member-portal:profile-test`
- `npm run member-portal:preferences-test`
- `npm run member-portal:sessions-test`
- `npm run member-portal:protected-data-scan`
- `npm run member-portal:full-song-scan`
- `npm run member-portal:private-media-scan`

## Common Incidents

Member cannot enter portal:
Run member auth health, confirm the member session cookie is present, and verify `/api/member/dashboard` returns 200 with private cache headers.

Dashboard unavailable:
Run `member-portal:dashboard-test`. Check `MemberDashboardService`, public content services, membership assignment, and effective entitlements.

Protected URL found in dashboard:
Treat as High or Critical depending on exposure. Disable member dashboard route if needed, run protected-data/full-song/private-media scans, and inspect dashboard composition output.

Membership summary incorrect:
Verify `membership:assignments-verify`, check the member assignment history, and invalidate the member portal cache for the affected member.

Logout did not clear private state:
Confirm `/api/auth/logout` revokes the member session, then force client cache clearing and revoke active protected playback sessions.

Suspended account retained access:
Run member auth health and protected-content health, revoke member sessions, revoke protected media authorizations, and verify the route guard shows the suspended state.

Public cache contains member data:
Purge CDN/public caches, confirm member APIs return `private, no-store`, and run `member-portal:cache-scan`.
