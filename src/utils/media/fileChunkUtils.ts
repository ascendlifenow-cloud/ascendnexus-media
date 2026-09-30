import type { DirectUploadPart } from "../../models/media";

export const DEFAULT_DIRECT_UPLOAD_MIN_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const DEFAULT_DIRECT_UPLOAD_PART_SIZE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_DIRECT_UPLOAD_MAX_PARTS = 10_000;

export interface FileChunkDescriptor {
  partNumber: number;
  startByte: number;
  endByte: number;
  sizeBytes: number;
}

export const calculateMultipartPartSize = (
  fileSizeBytes: number,
  preferredPartSizeBytes = DEFAULT_DIRECT_UPLOAD_PART_SIZE_BYTES,
  maxParts = DEFAULT_DIRECT_UPLOAD_MAX_PARTS,
): number => {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) return preferredPartSizeBytes;
  const minimumByPartCount = Math.ceil(fileSizeBytes / Math.max(1, maxParts));
  return Math.max(preferredPartSizeBytes, minimumByPartCount);
};

export const calculateTotalParts = (fileSizeBytes: number, partSizeBytes: number): number => {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0 || !Number.isFinite(partSizeBytes) || partSizeBytes <= 0) return 0;
  return Math.ceil(fileSizeBytes / partSizeBytes);
};

export const createFileChunks = (file: File, partSizeBytes: number): FileChunkDescriptor[] => {
  const totalParts = calculateTotalParts(file.size, partSizeBytes);
  return Array.from({ length: totalParts }, (_, index) => {
    const partNumber = index + 1;
    const startByte = index * partSizeBytes;
    const endByte = Math.min(file.size, startByte + partSizeBytes);
    return { partNumber, startByte, endByte, sizeBytes: endByte - startByte };
  });
};

export const getFileChunk = (file: File, chunk: Pick<FileChunkDescriptor, "startByte" | "endByte">): Blob =>
  file.slice(chunk.startByte, chunk.endByte);

export const mergeCompletedPartMetadata = (
  parts: readonly DirectUploadPart[],
  completedPart: DirectUploadPart,
): DirectUploadPart[] =>
  parts.map((part) => (part.partNumber === completedPart.partNumber ? { ...part, ...completedPart, status: "completed" } : part));

export const sortCompletedParts = <T extends { partNumber: number }>(parts: readonly T[]): T[] =>
  [...parts].sort((a, b) => a.partNumber - b.partNumber);

export const validateCompletedParts = (
  completedParts: readonly Pick<DirectUploadPart, "partNumber" | "etag">[],
  totalParts: number,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (completedParts.length !== totalParts) errors.push("Completed part count does not match expected total parts.");
  const seen = new Set<number>();
  sortCompletedParts(completedParts).forEach((part, index) => {
    if (part.partNumber !== index + 1) errors.push(`Missing or out-of-order part ${index + 1}.`);
    if (seen.has(part.partNumber)) errors.push(`Duplicate part ${part.partNumber}.`);
    if (!part.etag) errors.push(`Part ${part.partNumber} is missing an ETag.`);
    seen.add(part.partNumber);
  });
  return { valid: errors.length === 0, errors };
};
