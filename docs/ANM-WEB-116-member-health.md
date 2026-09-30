# ANM-WEB-116 Member Health

Member health provides an operator-safe summary of whether a member account is usable, verified, engaged, and free of immediate review signals.

## Health Signals

- Registration state
- Email verification state
- Login/activity state
- Favorites, follows, playlists, history, and notifications
- Security review status
- Engagement tracking status
- Retention signal

## Overall Health

The overall health report tracks total members, active members, suspended members, open support items, and security alert volume. It is available through `/api/admin/member-health` and the admin CRM health view.

## Verification

Run:

```bash
npm run member-crm:health
```

