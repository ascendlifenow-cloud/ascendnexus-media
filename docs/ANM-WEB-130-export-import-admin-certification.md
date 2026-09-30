# Export Import Certification

Prompt: ANM-WEB-130
Generated: 2026-08-11T15:35:03.781Z
Decision: ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS

## PASS - admin.export_import.health

Export/Import health and capability services are reachable.

Evidence:

```json
{
  "overallStatus": "healthy",
  "exportQueues": {
    "status": "healthy",
    "queued": 0
  },
  "importQueues": {
    "status": "healthy",
    "queued": 0
  },
  "packageStorage": {
    "status": "healthy",
    "root": "private-managed"
  },
  "stagingStorage": {
    "status": "healthy",
    "root": "private-managed"
  },
  "checksumService": {
    "status": "healthy",
    "algorithm": "sha256"
  },
  "streamingArchiveWriter": {
    "status": "ready",
    "archiveFormat": "tar",
    "packageVersion": "2.0.0"
  },
  "streamingArchiveReader": {
    "status": "ready",
    "archiveFormat": "tar",
    "packageVersion": "2.0.0"
  },
  "version2Format": {
    "status": "ready",
    "base64Media": false,
    "binaryEntries": true
  },
  "legacyMigration": {
    "status": "ready",
    "v1ImportSupported": true,
    "v1ProductionExportDisabled": true
  },
  "signingProvider": {
    "status": "ready",
    "algorithm": "Ed25519",
    "activeKeyId": "pkg-signing-1784092617544",
    "privateKeyStorage": "local-managed-private-file"
  },
  "activeSigningKey": {
    "status": "ready",
    "keyId": "pkg-signing-1784092617544"
  },
  "trustedSigners": {
    "status": "ready",
    "count": 1
  },
  "signatureVerification": {
    "status": "ready",
    "policy": "allow_unsigned_with_warning"
  },
  "encryptionProvider": {
    "status": "ready",
    "algorithm": "AES-256-GCM",
    "keyWrappingMode": "server_managed_key",
    "keyStorage": "local-managed-private-file"
  },
  "decryption": {
    "status": "ready",
    "algorithm": "AES-256-GCM"
  },
  "multipartStorage": {
    "status": "ready",
    "mode": "local_private_file_multipart_readiness"
  },
  "mergeMode": {
    "status": "ready",
    "policyCount": 8
  },
  "replaceSelectedMode": {
    "status": "ready",
    "requiresScope": true,
    "requiresReauthentication": true
  },
  "restoreMode": {
    "status": "ready",
    "requiresPlan": true,
    "controlledEnvironmentsOnly": true
  },
  "certificationState": {
    "status": "not_run",
    "decision": "incomplete"
  },
  "compatibilityService": {
    "status": "healthy",
    "packageVersion": "2.0.0",
    "legacyPackageVersion": "1.0.0",
    "schemaVersion": 1
  },
  "warnings": [],
  "errors": [],
  "checkedAt": "2026-08-11T15:35:03.771Z"
}
```
