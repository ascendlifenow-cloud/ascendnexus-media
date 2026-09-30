# ANM-WEB-102 Security Test Report

Environment: local development security verification.

Latest result: passed locally with launch decision `approved_with_exceptions`. No verifier failures were reported.

Commands:

```bash
npm run security:health
npm run typecheck
npm run build
```

Covered locally:

- Security response headers.
- CORS denial for unapproved admin origins.
- Local allowed admin origin behavior.
- Admin mutation block for malicious Origin.
- Public/private media and full-song public-field scan.
- Source/artifact secret pattern scan.
- Lockfile presence.
- Security documentation presence.
- Security finding/risk-exception/event/scan-run persistence shape and collection registration typecheck.

Not covered locally:

- Authorized staging DAST.
- Browser network inspection for provider scripts.
- Real object-storage IAM review.
- Production TLS/HSTS certificate validation.
- Malware scanner execution.
- MFA enrollment and recovery-code testing.
- CI/CD permissions and container image scan.
