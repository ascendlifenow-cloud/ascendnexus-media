# ANM-WEB-124 Legacy Package Migration

Version 1 JSON/base64 packages remain readable for migration compatibility.

Policy:
- New exports default to Package Version 2.
- Version 1 export is blocked in production.
- Version 1 imports are inspected through the legacy reader and can be dry-run with current safety checks.
- Legacy packages should be converted to Version 2 before operational migration.
