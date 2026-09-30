# ANM-WEB-102 Security Findings

| ID | Title | Severity | Status | Verification |
|---|---|---|---|---|
| SEC-102-001 | Credentialed CORS origin reflection | High | Resolved | `npm run security:cors` |
| SEC-102-002 | Missing centralized browser security headers | Medium | Resolved | `npm run security:headers` |
| SEC-102-003 | Admin mutation origin validation not centralized | High | Resolved | `npm run security:cors` |
| SEC-102-004 | Admin MFA not implemented | High | Deferred | Staging identity review/exception required |
| SEC-102-005 | Malware scanning provider not configured | High | Deferred | Scanner integration or approved exception required |

Critical findings: none confirmed by local checks.

High findings without final approval: MFA and malware scanning remain launch-gate blockers until resolved or explicitly accepted by the risk owner.
