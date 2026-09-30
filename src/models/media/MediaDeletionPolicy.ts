export interface MediaDeletionPolicy {
  policyId: string;
  allowArchive: boolean;
  allowRestore: boolean;
  allowSoftDelete: boolean;
  allowHardDelete: boolean;
  requireDependencyCheck: boolean;
  blockIfPubliclyReferenced: boolean;
  blockIfActiveVersion: boolean;
  blockIfLinked: boolean;
  allowDeleteArchivedOnly: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

