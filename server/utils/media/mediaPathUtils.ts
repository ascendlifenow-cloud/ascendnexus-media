import path from "node:path";

export const sanitizeFileName = (fileName: string): string => {
  const extension = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, extension)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "upload";
  return `${base}${extension}`.replace(/\.{2,}/g, ".");
};

export const getFileExtension = (fileName: string): string =>
  path.extname(fileName).replace(/^\./, "").toLowerCase();

export const hasPathTraversal = (value: string): boolean =>
  value.includes("..") || value.includes("/") || value.includes("\\") || value.includes("\0") || /^[a-z]+:/i.test(value);

export const buildSafeStoragePath = (input: {
  accessLevel: "public" | "private" | "admin_only" | "signed";
  assetType: string;
  targetType: string;
  fileName: string;
  publicPrefix: string;
  privatePrefix: string;
}): string => {
  const prefix = input.accessLevel === "public" ? input.publicPrefix : input.privatePrefix;
  const date = new Date().toISOString().slice(0, 10);
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return [prefix, input.targetType, input.assetType, date, `${nonce}-${sanitizeFileName(input.fileName)}`]
    .map((part) => part.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join("/");
};

export const resolveInsideRoot = (root: string, storagePath: string): string => {
  const resolved = path.resolve(root, storagePath);
  const normalizedRoot = path.resolve(root);
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    throw new Error("Storage path escapes upload root.");
  }
  return resolved;
};
