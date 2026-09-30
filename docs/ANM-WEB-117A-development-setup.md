# ANM-WEB-117A Development Setup

## Local Setup

1. Confirm the app is not using production environment settings.
2. Run `npm run seed:development`.
3. Keep the generated temporary password somewhere safe for the current session only.
4. Run `npm run seed:verify`.
5. Open `/admin/development/seeds` with an admin seed account.

## Staging Setup

Set staging configuration through approved deployment secrets, then run:

```text
npm run seed:staging
npm run seed:verify -- --environment=staging
```

If staging needs predictable passwords, set `DEVELOPMENT_SEED_PASSWORD` or `SEED_TEST_PASSWORD` through the staging secret manager.

## Reset

Resets remove only records carrying the ANM-WEB-117A seed marker or deterministic seed IDs.

```text
SEED_RESET_CONFIRM=RESET_DEVELOPMENT_IDENTITY_SEEDS npm run seed:reset
```

## Verification

`npm run seed:verify` checks:

- Expected admin accounts.
- Expected member accounts.
- Membership assignments.
- Billing scenarios.
- Engagement records.
- Protected content resources.
- Production guard.

Verification returns non-zero when required seed evidence is missing or when production execution is attempted.
