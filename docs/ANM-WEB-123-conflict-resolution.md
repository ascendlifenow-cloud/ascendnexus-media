# ANM-WEB-123 Conflict Resolution

Dry-run detects artist identity, release identity, and same-checksum media conflicts. Allowed resolutions are recorded with each conflict and include `skip`, `use_existing`, `create_new`, `merge`, and `rename_slug` where applicable.

The initial executor is conservative: it uses create-only semantics and skips records that already exist. Replace and restore modes require future elevated workflow hardening before production mutation use.
