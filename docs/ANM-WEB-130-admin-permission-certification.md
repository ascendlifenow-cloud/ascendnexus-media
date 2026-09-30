# Permissions Certification

Prompt: ANM-WEB-130
Generated: 2026-08-11T15:35:03.781Z
Decision: ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS

## PASS - admin.permissions.required

Launch-critical admin permissions are present in active roles.

Evidence:

```json
{
  "sourceOfTruth": "server/constants/auth/systemRoles.ts",
  "missingPermissions": [],
  "activeRuntimeRoles": [
    "super_admin",
    "admin",
    "content_manager",
    "media_manager",
    "publisher",
    "editor",
    "viewer",
    "read_only_admin",
    "support",
    "security_admin",
    "deployment_admin"
  ],
  "storedRoleSnapshotCount": 11
}
```
