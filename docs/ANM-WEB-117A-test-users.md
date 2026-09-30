# ANM-WEB-117A Test Users

## Admin Accounts

| Email | Role |
|---|---|
| `superadmin@ascendnexus.local` | `super_admin` |
| `admin@ascendnexus.local` | `admin` |
| `content@ascendnexus.local` | `content_manager` |
| `publisher@ascendnexus.local` | `publisher` |
| `moderator@ascendnexus.local` | `editor`, `viewer` |
| `support@ascendnexus.local` | `support` |

## Member Accounts

| Email | Tier | State |
|---|---|---|
| `free@ascendnexus.local` | Free | Active |
| `premium@ascendnexus.local` | Premium | Active |
| `supporter@ascendnexus.local` | Supporter | Grace |
| `vip@ascendnexus.local` | VIP | Trial |
| `suspended@ascendnexus.local` | Premium | Suspended |
| `disabled@ascendnexus.local` | Premium | Disabled / canceled |
| `pending@ascendnexus.local` | Free | Pending verification |
| `expired@ascendnexus.local` | Premium | Expired |

## Password Handling

Use `npm run seed:development` to generate temporary credentials. For shared dev environments, use `DEVELOPMENT_SEED_PASSWORD` or `SEED_TEST_PASSWORD` from an uncommitted environment file or secret manager.

Never commit passwords, generated output, or screenshots containing temporary seed credentials.
