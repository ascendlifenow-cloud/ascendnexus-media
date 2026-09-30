# ANM-WEB-110 Public Experience Architecture

## Scope

ANM-WEB-110 adds the guest-facing landing experience and public access policy layer. The public homepage now consumes a composed `/api/public/landing` projection instead of stitching together seed data or local-only state.

## Public Landing Source

`PublicLandingService` composes only existing public delivery records:

- published site configuration
- published homepage data
- active published artists
- published releases
- featured releases
- published gallery items

The service does not query admin repositories directly and does not expose drafts, archived records, member-only records, signed URLs, private storage paths, full-song fields, publication internals, or admin metadata.

## Guest Access Policy

`GuestAccessPolicyService` defines the launch access levels:

- `public`
- `guest_preview`
- `member_preview`
- `premium_member`
- `admin_only`
- `private`

Only `public` and `guest_preview` content can appear in the public landing payload. Member and premium content remains excluded until ANM-WEB-112 entitlement rules are active.

## Public Routes

Guest-safe public routes include:

- `/`
- `/artists`
- `/songs`
- `/gallery`
- `/search`
- `/browse`
- `/login`
- `/register`

Administrator login remains isolated at `/admin/login`.

## Verification

The following commands were added:

- `npm run public-experience:health`
- `npm run public-experience:verify`
- `npm run public-experience:validate-config`
- `npm run public-experience:network-scan`
- `npm run public-experience:private-data-scan`
- `npm run public-experience:full-song-scan`
- `npm run public-experience:smoke-test`
- `npm run public-experience:accessibility`
- `npm run public-experience:performance`

Warnings are allowed for missing optional public preview content. Any private data, signed URL, storage path, full-song reference, or admin metadata exposure is blocking.
