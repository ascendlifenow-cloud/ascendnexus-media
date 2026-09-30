# ANM-WEB-123 Import Rollback

Import jobs track created artist IDs, release IDs, and media asset IDs. Rollback removes records created by the import job and detaches media links for imported assets. The initial rollback does not replace historical snapshots for updated records because the default import mode does not update existing records.
