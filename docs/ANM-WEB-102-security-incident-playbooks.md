# ANM-WEB-102 Security Incident Playbooks

## Compromised Admin Account

Disable user, revoke sessions, rotate password/MFA, inspect audit events, verify no unauthorized publication/media changes, and restore from prior versions if needed.

## Credential Leakage

Revoke or rotate the exposed credential first, then remove the source, scan logs/artifacts/history, assess use, and document incident scope.

## Full-Song Public Exposure

Immediately remove public object/cache entries, rotate signed URL credentials if needed, unpublish affected release, run full-song privacy verifier, preserve evidence, and notify legal/privacy review.

## Private-Media Public Exposure

Remove public mapping, invalidate CDN/cache, verify private prefix/object ACL, inspect publication operation, and run public API safety scan.

## Malicious Upload or Malware

Quarantine asset, block publication, preserve file in isolated storage for scanner review, identify uploader/admin action, and verify no derivative/public promotion occurred.

## Dependency Zero-Day

Identify reachable package, disable affected feature if possible, upgrade/patch, run tests/build/security scan, and record exception only when no fix exists.

## CI/CD Compromise

Disable deployment credentials, revoke CI tokens, freeze production deploys, verify artifacts, rotate secrets, rebuild from trusted state, and review workflow permissions.

Each playbook requires evidence preservation, communication owner assignment, recovery verification, and postmortem.
