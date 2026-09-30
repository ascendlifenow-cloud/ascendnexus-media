# ANM-WEB-117A Development & Staging Identity Seed System

## Architecture

ANM-WEB-117A adds a single development/staging seed engine in `DevelopmentSeedService`. It writes only to the existing application collections and uses deterministic IDs plus a `seedTag` metadata marker for idempotent updates and scoped reset.

The seed system is blocked in production by `resolveEnvironment()`. Allowed environments are `development`, `test`, and `staging`.

## Seeded Areas

- Admin users and real admin roles.
- Member accounts and account states.
- Membership assignments for active, trial, grace, canceled, expired, and suspended cases.
- Billing subscriptions, invoices, payments, coupon, refund, gift, and failed-payment scenarios.
- Public and protected release fixtures.
- Protected media resources and delivery profile.
- Favorites, follows, playlists, playback history, notifications, and saved searches.

## Passwords

By default, seed runs generate a secure random temporary password and return it once through CLI output. Raw passwords are never persisted.

For predictable local/staging automation, set `DEVELOPMENT_SEED_PASSWORD` or `SEED_TEST_PASSWORD`. Do not commit either value.

## Commands

- `npm run seed:development`
- `npm run seed:staging`
- `npm run seed:reset`
- `npm run seed:verify`
- `npm run seed:users`

Reset requires:

```text
SEED_RESET_CONFIRM=RESET_DEVELOPMENT_IDENTITY_SEEDS npm run seed:reset
```

## Admin Dashboard

The dashboard is available at `/admin/development/seeds` and requires `users.manage`.

It exposes seed verification, seed execution, scoped reset, production guard status, and the expected user matrix.

## Production Protection

Production execution returns a blocked result or throws before any database mutation. This is intentional and required for launch safety.
