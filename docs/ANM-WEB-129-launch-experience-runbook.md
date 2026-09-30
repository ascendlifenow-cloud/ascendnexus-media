# Launch Experience Runbook

Prompt: ANM-WEB-129
Generated: 2026-08-11T15:22:36.916Z
Decision: EXPERIENCE READY WITH POST-LAUNCH ITEMS

## Verify

Run:

```bash
npm run launch:public-smoke
npm run launch:member-smoke
npm run launch:experience-routes
npm run launch:member-access-matrix
npm run launch:experience-a11y
npm run launch:experience-performance
npm run launch:browser-health
```

## Response Playbooks

- Public route not found: verify AppRouter route registration and public API slug data.
- Member route blank: check MemberRouteGuard, member session, and browser console.
- Public media broken: verify public-safe URL promotion and storage object access level.
- Protected URL exposed: block launch, demote media, purge caches, rerun full-song and private-media scans.
- Console/network errors: capture the route, request URL, status code, and stack; fix before verification.
- Accessibility failure: fix focus, label, contrast, and keyboard issues before final verification.

Current decision: EXPERIENCE READY WITH POST-LAUNCH ITEMS
