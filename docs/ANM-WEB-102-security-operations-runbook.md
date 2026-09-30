# ANM-WEB-102 Security Operations Runbook

Run health:

```bash
npm run security:health
```

Critical finding:

1. Stop deployment.
2. Preserve evidence.
3. Contain affected feature/provider.
4. Patch and run targeted verification.
5. Update findings and launch decision.

Secret detected:

1. Rotate/revoke before cleanup.
2. Remove source and rebuild artifacts.
3. Scan logs/build/history where authorized.
4. Document incident review.

Full-song/private-media exposure:

1. Unpublish affected content.
2. Delete or privatize public object.
3. Invalidate CDN/public cache.
4. Run `npm run security:full-song` and `npm run public-api:verify`.

Auth attack:

1. Review failed-login and rate-limit data.
2. Disable compromised accounts.
3. Revoke sessions.
4. Require password reset/MFA review.

Emergency disables:

- Analytics: `ANALYTICS_ENABLED=false`, provider `none`.
- Forms: `FEATURE_CONTACT_ENABLED=false`, `NEWSLETTER_ENABLED=false`.
- Publication: `MEDIA_PUBLICATION_ENABLED=false`.

Evidence: retain audit records, logs, object versions, configuration version, commit SHA, and timestamps.
