import { mediaBackendConfig } from "../../config/mediaBackendConfig";

export const calculateMultipartPartSize = (
  fileSizeBytes: number,
  preferredPartSizeBytes = mediaBackendConfig.directUploadPartSizeBytes,
  maxParts = mediaBackendConfig.directUploadMaxParts,
): number => {
  const safeFileSize = Math.max(0, fileSizeBytes);
  if (!safeFileSize) return preferredPartSizeBytes;
  return Math.max(preferredPartSizeBytes, Math.ceil(safeFileSize / Math.max(1, maxParts)));
};

export const calculateTotalParts = (fileSizeBytes: number, partSizeBytes: number): number =>
  fileSizeBytes > 0 && partSizeBytes > 0 ? Math.ceil(fileSizeBytes / partSizeBytes) : 0;

export const createUploadParts = (fileSizeBytes: number, partSizeBytes: number) =>
  Array.from({ length: calculateTotalParts(fileSizeBytes, partSizeBytes) }, (_, index) => {
    const partNumber = index + 1;
    const start = index * partSizeBytes;
    const end = Math.min(fileSizeBytes, start + partSizeBytes);
    return {
      partNumber,
      sizeBytes: end - start,
      status: "pending" as const,
      attempts: 0,
    };
  });

export const sortCompletedParts = <T extends { partNumber: number }>(parts: readonly T[]): T[] =>
  [...parts].sort((a, b) => a.partNumber - b.partNumber);

export const validateCompletedParts = (
  completedParts: readonly { partNumber: number; etag?: string }[],
  totalParts: number,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const seen = new Set<number>();
  const sorted = sortCompletedParts(completedParts);
  if (sorted.length !== totalParts) errors.push("Completed part count does not match expected total parts.");
  sorted.forEach((part, index) => {
    if (part.partNumber !== index + 1) errors.push(`Missing or unordered part ${index + 1}.`);
    if (seen.has(part.partNumber)) errors.push(`Duplicate part ${part.partNumber}.`);
    if (!part.etag?.trim()) errors.push(`Part ${part.partNumber} is missing an ETag.`);
    seen.add(part.partNumber);
  });
  return { valid: errors.length === 0, errors };
};
