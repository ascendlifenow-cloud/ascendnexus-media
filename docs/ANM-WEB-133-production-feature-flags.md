# ANM-WEB-133 Production Feature Flags

Prompt: ANM-WEB-133
Generated: 2026-08-11T16:47:59.738Z
Environment: development
Final Decision: NO-GO

| Flag | Launch State | Owner | Reason | Emergency Change |
|---|---|---|---|---|
| AUTH_ENABLED | false | security | Authentication must be enabled for production launch. | Change through approved environment/config deployment, record in launch notes, rerun affected gate. |
| CSRF_ENABLED | false | security | Credentialed mutations require CSRF protection. | Change through approved environment/config deployment, record in launch notes, rerun affected gate. |
| RATE_LIMIT_ENABLED | false | security | Sensitive endpoints require abuse protection. | Change through approved environment/config deployment, record in launch notes, rerun affected gate. |
| MEDIA_INTAKE_ENABLED | false | media | Watched-folder ingestion only runs when explicitly enabled. | Change through approved environment/config deployment, record in launch notes, rerun affected gate. |
| EMAIL_ENABLED | false | identity | Registration verification and password recovery depend on email delivery. | Change through approved environment/config deployment, record in launch notes, rerun affected gate. |
| MONITORING_ENABLED | false | operations | Production launch requires monitoring and alert evidence. | Change through approved environment/config deployment, record in launch notes, rerun affected gate. |
| CDN_ENABLED | false | infrastructure | Production public media delivery requires CDN evidence. | Change through approved environment/config deployment, record in launch notes, rerun affected gate. |
| ANALYTICS_ENABLED | false | privacy | Analytics must remain consent-aware and privacy safe. | Change through approved environment/config deployment, record in launch notes, rerun affected gate. |
