import type { UploadedMediaFile } from "../../models/mediaModels";

const startsWith = (buffer: Buffer, signature: number[]): boolean =>
  signature.every((value, index) => buffer[index] === value);

export const detectFileSignature = (buffer: Buffer): string | undefined => {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buffer.slice(0, 3).toString("ascii") === "ID3" || startsWith(buffer, [0xff, 0xfb]) || startsWith(buffer, [0xff, 0xf3])) return "audio/mpeg";
  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WAVE") return "audio/wav";
  if (buffer.slice(4, 8).toString("ascii") === "ftyp") return "audio/mp4";
  if (buffer.slice(0, 4).toString("ascii") === "OggS") return "audio/ogg";
  return undefined;
};

export const signatureMatchesMime = (file: UploadedMediaFile): boolean => {
  const signature = detectFileSignature(file.buffer);
  if (!signature) return true;
  if (signature === file.mimeType) return true;
  if (signature === "audio/wav" && file.mimeType === "audio/x-wav") return true;
  if (signature === "audio/mp4" && ["audio/mp4", "audio/aac", "video/mp4"].includes(file.mimeType)) return true;
  return false;
};
