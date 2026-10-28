export interface MemberSongUsageRecord {
  usageId: string;
  memberId: string;
  releaseId: string;
  songId: string;
  streamStarts: number;
  downloadStarts: number;
  freePlayUsed: boolean;
  freeAuthorizationId?: string;
  lastStreamAt?: string;
  lastDownloadAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}
