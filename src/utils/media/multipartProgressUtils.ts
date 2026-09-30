import type { DirectUploadPart } from "../../models/media";

export const calculateMultipartProgress = (
  parts: readonly DirectUploadPart[],
  totalFileSizeBytes: number,
  activeBytes: Record<number, number> = {},
): number => {
  if (!Number.isFinite(totalFileSizeBytes) || totalFileSizeBytes <= 0) return 0;
  const completedBytes = parts
    .filter((part) => part.status === "completed")
    .reduce((sum, part) => sum + part.sizeBytes, 0);
  const inFlightBytes = Object.values(activeBytes).reduce((sum, bytes) => sum + Math.max(0, bytes), 0);
  return Math.min(100, Math.round(((completedBytes + inFlightBytes) / totalFileSizeBytes) * 100));
};

export const getMultipartPartCounts = (parts: readonly DirectUploadPart[]) => ({
  total: parts.length,
  completed: parts.filter((part) => part.status === "completed").length,
  failed: parts.filter((part) => part.status === "failed").length,
  pending: parts.filter((part) => part.status === "pending").length,
  uploading: parts.filter((part) => part.status === "uploading").length,
  canceled: parts.filter((part) => part.status === "canceled").length,
});
