# Playback-first acceptance — 2026-11-08

## Release gate

The owner paused payment rollout until the application listening experience is
verified. Do not enable Stripe checkout or live payments as part of this work.

## Permission contract

- Guest: approved public previews only.
- Active verified Free: one server-accounted full-stream start per eligible song.
- Active verified Premium, Supporter, VIP: unlimited starts for songs permitted by
  current content policies and their explicit entitlements.
- Streaming never implies download permission. Downloads require separate current
  grants and content enablement. Drafts, takedowns, embargoes and inactive accounts
  remain denied, including for VIP. Admin roles do not grant consumer access.
- Counts describe delivery starts, not proof of completed listens. HEAD, issuance,
  and subsequent ranges in one authorization do not consume additional plays.

## Evidence

Read-only staging source evaluation found 39 published releases, 39 selected audio
assets with private ready storage metadata, and zero public full-song storage
records. Both active verified VIP accounts are authorized for all 39. This is not
proof of byte delivery. Seven other records have status published but publication
state ready_to_publish; 86 are drafts. No publication state was changed.

Isolated staging run `6a59ac24-bdca-4ebe-b526-9bd4aa7bf675` passed real login for
all four tiers, guest denial, cross-member denial, HEAD and no-debit checks.
Its first byte-range request failed with HTTP 502; the same private synthetic
fixture returned correct 206 through direct origin and a local gateway. Render
logs show origin HTTP 400 and a storage_read failure. All disposable test records
and the private fixture were cleaned up. No real membership or song play changed.
This remains a blocking acceptance failure, not a successful playback test.

## Implemented corrections

The member catalog uses current server song decisions rather than only the public
feed. Member detail requests also use a member endpoint. Public discovery remains
separate; no protected stream URLs are included in catalog responses.

The floating queue requests protected full streams for authenticated members;
explicit previews remain a separate action. Guest queue playback stays preview-only.
Protected sources remain in memory, with refresh, expiry and revocation checks.

The song-detail cover now carries round play/pause and mute controls at bottom
right. Server-backed start counts appear top right after playback begins; remaining
play allowance appears top left only for limited access. Seeking remains available.
Logout clears protected sources. No fake counts or paid entitlement is introduced.

## Required before charging

Verify deployed full-song decoding and complete playback, seeking and refresh;
queue transitions; all eligible VIP catalog records; Free allowance continuation;
downgrade, suspension and logout cleanup; mobile layouts and account isolation.
Review the seven inconsistent publication records through normal admin publication
controls, not an authorization bypass. Stripe sandbox setup resumes only after
these blockers are resolved and the owner accepts the listening experience.
