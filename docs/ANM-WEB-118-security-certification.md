# ANM-WEB-118 Security Certification

Security certification consumes the existing launch gate and member-system verification commands.

## Covered Areas

- Authentication and authorization
- Cross-member isolation
- Member/admin permission boundaries
- Protected media authorization
- Public/private cache separation
- Full-song and private-media safety
- Billing raw-card storage prohibition
- Audit and security event readiness
- CORS, headers, CSRF, and secrets checks

## Evidence Commands

```bash
npm run security:launch-gate
npm run security:authz-test
npm run access:full-song-scan
npm run protected-content:private-media-scan
npm run member-portal:protected-data-scan
npm run billing:verify
```

