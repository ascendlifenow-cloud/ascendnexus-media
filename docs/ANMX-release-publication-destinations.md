# Release publication destinations

## Admin workflow

Choose **Publication Destinations** in the release editor or Publish Readiness
drawer. Both edit the same draft fields. Save and Publish saves pending changes
before the existing authorized publication workflow runs.

- Minimum audience: Public (including guests), Registered Free and above,
  Premium and above, Supporter and above, or VIP.
- Placements: Homepage and New Releases, independently selectable.

Audience eligibility follows configured entitlements, not a numeric tier-rank
bypass. Homepage eligibility continues to respect existing featured ordering,
section configuration and bounded lists. New Releases selection does not remove
the song from the full eligible Songs catalog. Guest discovery never includes a
member-only release, even when Homepage is selected. Guest discovery is not
permission to play a full song: streaming and downloads retain separate checks.

These are website destinations, not social-media or music-distribution uploads.
No records are automatically published or migrated by deployment. Stripe rollout
remains paused; this feature does not enable payments or resolve storage playback.

## Persistence and enforcement

Release metadata contains `publicationAudience`, `publicationHomepage` and
`publicationNewReleases`. Missing legacy fields preserve prior behavior. Invalid
audiences and malformed booleans are rejected server-side; persisted invalid data
fails closed during discovery and authorization. The editor requires explicit
correction rather than silently converting an invalid audience into Public.

Publication sets public visibility only for Public audience. Resource audience
checks are additional to existing account, policy, publication, embargo, override,
and download checks. Private masters are not promoted by these controls.

Audience/placement updates keep the existing save-before-republish workflow,
invalidate public and member caches, and revoke active release authorizations and
playback sessions. In-flight cache loaders cannot repopulate invalidated entries.
Publication audit events record the selected destinations.

## Verification

Run `npm run test:release-publication-targets`,
`npm run test:release-publication-enforcement`, and
`npm run test:admin-release-publication-targets`, plus song permissions and member
catalog regressions. Tests use isolated synthetic data; no real song is published.
Verify draft save/reload, selection in both editor and drawer, public versus VIP
visibility, homepage and new-release exclusions, and normal preview/playback access
after staging deployment. Full-song storage delivery remains a separate blocker.
