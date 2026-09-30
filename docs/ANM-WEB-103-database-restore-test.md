# ANM-WEB-103 Database Restore Test

Status: not completed in this local implementation pass.

Required before production verification:

1. Select a current staging or production-compatible backup.
2. Restore into an isolated recovery database.
3. Run migrations/index verification.
4. Verify record counts for artists, releases, media assets, publication operations, audit events, forms, consent, and deployment records.
5. Verify private media references and full-song privacy remain intact.
6. Record duration, backup reference category, failures, and corrective actions.

Until this file is updated with real restore evidence, the production launch gate remains blocked.
