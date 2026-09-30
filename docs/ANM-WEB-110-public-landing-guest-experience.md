# ANM-WEB-110 Public Landing & Guest Experience

## Guest Experience

The public landing page presents a guest-safe entry point for Ascend Nexus Media:

- hero feature from public release or artist data
- latest published releases
- featured releases
- active published artist spotlights
- approved audio-preview cards when public preview URLs exist
- published gallery previews when available
- genre and style discovery links
- member sign-in and join CTAs

## Public-Safe Content Rules

The landing payload is built from public projections and scanned before delivery. It must not contain:

- drafts or archived records
- private/member-only content
- full-song URLs or full-song asset fields
- signed URLs
- private storage paths
- admin notes, audit history, or publication internals
- browser blob URLs

## Tier Awareness

Launch tiers are represented through `GuestAccessPolicy`:

- `public`: visible to all visitors
- `guest_preview`: visible and playable as a public preview
- `member_preview`, `premium_member`, `admin_only`, `private`: excluded from guest payloads

Member account pages at `/login` and `/register` are public member identity pages. They remain separate from `/admin/login`.

## Navigation and Footer

`PublicShell` continues to honor published site configuration, filters unsafe links, and appends safe public account links when the published configuration omits them.

## Known Limitations

Local verification currently reports warnings when the local published dataset has no public audio-preview URLs or gallery items. Those warnings are not privacy blockers; staging certification should include at least one published release with a verified preview and one published gallery item.
