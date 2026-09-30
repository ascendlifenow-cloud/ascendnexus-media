# ANM-WEB-116 Member Moderation

Member moderation records operator actions that affect member account trust, access, or review state.

## Actions

- `warn`
- `suspend`
- `disable_features`
- `restrict_access`
- `temporary_ban`
- `permanent_ban`
- `restore`

## Account Effects

- `suspend` and `temporary_ban` set account status to `Suspended`.
- `permanent_ban` sets account status to `Disabled`.
- `restore` sets account status to `Active`.

## Rules

All moderation actions require administrative authorization and a reason. Moderation records appear in the member timeline and contribute to member risk scoring. Protected media and entitlement revocation continue to be enforced by the access and protected-content systems.

