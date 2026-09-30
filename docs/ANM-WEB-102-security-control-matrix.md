# ANM-WEB-102 Security Control Matrix

| Control | Local status | Evidence | Remaining work |
|---|---|---|---|
| Authentication | Implemented | ANM-WEB-085, auth smoke, secure cookies in strict config | MFA finalization |
| Authorization | Implemented | Backend permissions, route manifest, matrix | Staging authz coverage report |
| CORS | Hardened | Centralized security headers utility | Production origin allowlist confirmation |
| CSRF | Partial | Admin Origin validation + SameSite cookies | CSRF token flow readiness |
| CSP/headers | Hardened | `securityHeaderUtils` and verifier | Browser CSP report-only pass |
| Public DTO safety | Implemented | Public response safety service | Staging DAST |
| Full-song privacy | Implemented | Storage/privacy verifiers and security health | CDN object audit |
| Upload security | Partial | Signature/size validation config | Malware scanner |
| Analytics privacy | Implemented | ANM-WEB-101 verifier | Provider network inspection |
| Secret scanning | Partial | Local source/artifact scan | CI secret scanner/Git history scan |
| Dependency scan | Partial | Lockfile present, npm audit readiness | Live audit/SBOM artifact |
| Incident response | Implemented docs | Incident plan/playbooks | Named responders and drill |
