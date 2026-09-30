# ANM-WEB-102 Production Threat Model

Method: STRIDE-oriented review across browser, API, database, storage, queue, provider, and CI trust boundaries.

| Threat ID | STRIDE | Asset | Attack path | Severity | Existing controls | Required remediation/status |
|---|---|---|---|---|---|---|
| TM-001 | Spoofing | Admin portal | Credential stuffing or stolen session | High | Password policy, session cookies, login rate limiting | MFA remains production blocker/compensating-control item |
| TM-002 | Tampering | Publication state | Direct mutation of status/publicVisibility | High | Service allowlists, publication orchestration | Continue authz tests in staging |
| TM-003 | Repudiation | Admin actions | Unsafe audit snapshots or missing actor | Medium | Audit persistence, sanitized snapshots | Tamper-evidence limited by storage provider |
| TM-004 | Information disclosure | Full-song masters | Public DTO/cache/metadata/analytics leak | Critical | Full-song privacy verifiers, public response scanner, analytics minimization | Blocks launch if verifier fails |
| TM-005 | Information disclosure | Contact/newsletter data | Public/API/log leakage | High | Admin auth, token hashing, response safety, log redaction | Export policy pending |
| TM-006 | DoS | Search/forms/analytics | Flooding expensive endpoints | Medium | Body/query bounds, smoke tests | Redis-backed distributed rate limits require staging |
| TM-007 | Elevation of privilege | Admin APIs | Frontend-only permission checks | Critical | Backend permission checks in route controllers/services | Route manifest + authz test suite required |
| TM-008 | Tampering | Object storage | Worker/API overwrites public object | High | Versioned paths, publication service, reconciliation | Provider IAM least privilege to verify in ANM-WEB-103 |
| TM-009 | Information disclosure | Secrets | Bundle/log/config leak | Critical | Config redaction, source scan, public runtime DTO | Secret scanning in CI required |
| TM-010 | Injection | Search/metadata/forms | NoSQL/XSS/header/log injection | High | Query validation, React escaping, URL safety utilities | Security test corpus required for staging |

Launch decision: local controls are improved, but final approval requires staging DAST, MFA decision, malware scanning decision, and infrastructure TLS/IAM validation.
