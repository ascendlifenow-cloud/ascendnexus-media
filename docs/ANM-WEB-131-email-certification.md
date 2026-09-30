# Email Certification

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

## FAIL - infra.email.production_delivery

Verification/password-reset email delivery has not been proven through a production provider.

Evidence:

```json
{
  "enabled": false,
  "provider": "disabled",
  "fromConfigured": false,
  "health": {
    "emailProviderAvailable": false,
    "emailQueueAvailable": true,
    "emailWorkerAvailable": false,
    "pendingDeliveryCount": 0,
    "failedDeliveryCount": 13,
    "deadLetterCount": 0,
    "provider": "disabled"
  }
}
```
