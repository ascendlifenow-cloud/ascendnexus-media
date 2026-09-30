import { MediaApiError } from "../utils/media/mediaErrorUtils";
import type { UploadedMediaFile } from "../models/mediaModels";

interface ParsedMultipart {
  fields: Record<string, string>;
  files: UploadedMediaFile[];
}

const parseContentDisposition = (value: string): Record<string, string> =>
  Object.fromEntries(value.split(";").slice(1).map((part) => {
    const [key, raw] = part.trim().split("=");
    return [key, raw?.replace(/^"|"$/g, "") ?? ""];
  }));

export const parseJsonBody = async (request: import("node:http").IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.trim() ? JSON.parse(raw) : {};
};

export const parseMultipartRequest = async (request: import("node:http").IncomingMessage, maxBytes = 260 * 1024 * 1024): Promise<ParsedMultipart> => {
  const contentType = request.headers["content-type"] ?? "";
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
  if (!boundaryMatch) throw new MediaApiError("MEDIA_REQUEST_INVALID", "Multipart boundary is missing.", 400, "parse");
  const boundary = `--${boundaryMatch[1]}`;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += next.length;
    if (total > maxBytes) throw new MediaApiError("MEDIA_FILE_TOO_LARGE", "Upload request exceeds configured maximum size.", 413, "parse");
    chunks.push(next);
  }
  const raw = Buffer.concat(chunks);
  const body = raw.toString("binary");
  const fields: Record<string, string> = {};
  const files: UploadedMediaFile[] = [];
  for (const part of body.split(boundary)) {
    if (!part.includes("Content-Disposition")) continue;
    const [rawHeaders, ...rawBodyParts] = part.split("\r\n\r\n");
    const rawBody = rawBodyParts.join("\r\n\r\n").replace(/\r\n--$/, "").replace(/\r\n$/, "");
    const dispositionLine = rawHeaders.split("\r\n").find((line) => /^Content-Disposition:/i.test(line));
    if (!dispositionLine) continue;
    const disposition = parseContentDisposition(dispositionLine.replace(/^Content-Disposition:\s*/i, ""));
    const contentTypeLine = rawHeaders.split("\r\n").find((line) => /^Content-Type:/i.test(line));
    const name = disposition.name;
    if (!name) continue;
    if (disposition.filename) {
      files.push({
        fieldName: name,
        fileName: disposition.filename,
        mimeType: contentTypeLine?.replace(/^Content-Type:\s*/i, "").trim() || "application/octet-stream",
        size: Buffer.byteLength(rawBody, "binary"),
        buffer: Buffer.from(rawBody, "binary"),
      });
    } else {
      fields[name] = Buffer.from(rawBody, "binary").toString("utf8");
    }
  }
  if (!files.length) throw new MediaApiError("MEDIA_FILE_MISSING", "A file is required.", 400, "parse");
  return { fields, files };
};
