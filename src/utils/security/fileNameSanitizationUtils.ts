const reservedNames = new Set([".", "..", "con", "prn", "aux", "nul", "com1", "com2", "lpt1", "lpt2"]);

export const getSafeFileExtension = (fileName: string | null | undefined): string => {
  const name = fileName?.trim() ?? "";
  const last = name.split(/[\\/]/).pop() ?? "";
  const parts = last.split(".").filter(Boolean);
  return (parts.pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
};

export const getAllFileExtensions = (fileName: string | null | undefined): string[] => {
  const last = (fileName?.trim() ?? "").split(/[\\/]/).pop() ?? "";
  const parts = last.split(".").filter(Boolean);
  return parts.length > 1 ? parts.slice(1).map((part) => part.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean) : [];
};

export const sanitizeUploadFileName = (fileName: string | null | undefined, maxLength = 140): string => {
  const extension = getSafeFileExtension(fileName);
  const original = (fileName?.trim() || "upload").replace(/\0/g, "");
  const last = original.split(/[\\/]/).pop() || "upload";
  const withoutExtension = extension ? last.replace(new RegExp(`\\.${extension}$`, "i"), "") : last;
  const base = withoutExtension
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeBase = !base || reservedNames.has(base) ? "upload" : base;
  const suffix = extension ? `.${extension}` : "";
  const maxBaseLength = Math.max(1, maxLength - suffix.length);
  return `${safeBase.slice(0, maxBaseLength).replace(/-+$/g, "") || "upload"}${suffix}`;
};

