# ANM-WEB-103 Rollback Drill

Status: not completed in staging.

Required drill:

1. Deploy release A to staging and verify.
2. Deploy release B to staging and verify.
3. Request rollback to release A.
4. Verify API, client, workers, database compatibility, queues, caches, public content, and private-media safety.
5. Record release IDs, migration versions, duration, failures, and corrective actions.

The codebase now includes rollback compatibility evaluation and admin/API request surfaces, but real rollback execution must remain CI/CD or platform-controlled.
