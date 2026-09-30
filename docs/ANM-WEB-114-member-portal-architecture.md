# ANM-WEB-114 Member Portal Architecture

## Decision

The canonical authenticated member experience is `/member`. Public account aliases redirect into `/member/*`, while administrative routes remain under `/admin` and continue to use admin RBAC.

## Sources of Truth

- Member session: ANM-WEB-111 member cookie and `MemberIdentityService`.
- Membership and entitlement state: ANM-WEB-112 membership assignment and effective entitlement services.
- Protected media: ANM-WEB-113 protected-content authorization APIs; dashboard responses never include stream, download, signed, or storage URLs.
- Content: existing published public content services plus access-ready member sections.
- Profile, preferences, security, and sessions: member identity APIs, exposed through `/api/member/*` aliases.

## Route Map

`/member`, `/member/home`, `/member/profile`, `/member/preferences`, `/member/security`, `/member/sessions`, `/member/membership`, `/member/exclusive-content`, `/member/early-access`, `/member/recommendations`, plus readiness routes for favorites, following, history, playlists, and notifications.

## Cache Strategy

Member portal APIs return `Cache-Control: private, no-store`. Server dashboard composition uses a short-lived member-scoped in-memory cache keyed by member ID, authorization version, and profile update timestamp. Protected delivery artifacts are excluded.

## Known Limitations

Favorites, following, playlists, durable listening history, notification center, billing checkout, and durable avatar upload processing are readiness-only until ANM-WEB-115 through ANM-WEB-117. The portal labels these honestly and does not fake local-only operational state.
