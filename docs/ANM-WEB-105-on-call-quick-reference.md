# ANM-WEB-105 On-Call Quick Reference

## First Commands

```bash
npm run observability:health -- --environment=production --json
npm run reliability:health -- --environment=production --json
npm run security:health -- --environment=production
npm run deployment:health -- --environment=production
npm run seo:indexing-launch-gate -- --environment=production --json
```

## Protected Admin Pages

- `/admin/system/observability`
- `/admin/system/deployment`
- `/admin/media/processing`
- `/admin/seo`
- `/admin/settings`

## Emergency Checklist

- Identify current release in deployment dashboard.
- Check active incidents and critical health failures.
- Preserve logs and command output.
- Enable maintenance mode if user safety or data integrity is at risk.
- Pause workers/publication for queue or media safety incidents.
- Purge public caches after takedown or rollback.
- Revoke sessions for auth compromise.
- Disable forms or analytics if provider/privacy controls fail.

Do not include secrets in incident notes.
