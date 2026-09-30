# ANM-WEB-111 Session Management

Member sessions are stored separately from admin sessions.

## Cookie

Default cookie: `anm_member_session`

The cookie is HTTP-only, same-site controlled by backend auth configuration, and secure when the environment requires secure cookies.

## Policy

- Standard session TTL: 8 hours.
- Remember-me session TTL: 30 days.
- Sessions store token hashes only.
- Logout revokes the current session.
- Password reset and password change revoke active member sessions.
- Account deletion revokes active member sessions.

Members can view and revoke sessions at `/account/sessions`.
