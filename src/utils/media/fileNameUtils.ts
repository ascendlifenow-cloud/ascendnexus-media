export const getFileExtension = (fileName: string | null | undefined): string => {
  const safeName = fileName?.trim() ?? "";
  const lastSegment = safeName.split(/[\\/]/).pop() ?? "";
  const extension = lastSegment.includes(".") ? lastSegment.split(".").pop() ?? "" : "";
  return extension.toLowerCase().replace(/[^a-z0-9]/g, "");
};

export const sanitizeFileName = (fileName: string | null | undefined): string => {
  const original = fileName?.trim() || "upload";
  const name = original
    .split(/[\\/]/)
    .pop()
    ?.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/\.+/g, ".")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .replace(/^-+|-+$/g, "");

  return name || "upload";
};

export const safeFileNameWithTimestamp = (fileName: string, timestamp = Date.now()): string => {
  const safeName = sanitizeFileName(fileName);
  return `${timestamp}-${safeName}`;
};
