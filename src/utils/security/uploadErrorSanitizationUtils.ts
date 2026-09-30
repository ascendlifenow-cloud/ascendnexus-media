export interface SanitizedUploadError {
  code: string;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export const sanitizeUploadError = (error: unknown, fallbackCode = "upload_error"): SanitizedUploadError => {
  const raw = error instanceof Error ? error.message : String(error || "Upload failed.");
  const message = raw
    .replace(/https?:\/\/[^\s?]+[^\s]*/gi, "[redacted-url]")
    .replace(/(token|secret|authorization|cookie|apikey|api_key)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/\n\s*at\s+.*$/gms, "")
    .slice(0, 300);
  return {
    code: fallbackCode,
    message: message || "Upload failed.",
  };
};

