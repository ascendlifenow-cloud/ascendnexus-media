export const hasPathTraversal = (value: string | null | undefined): boolean => {
  const raw = value ?? "";
  const decoded = safeDecodeURIComponent(raw).toLowerCase();
  return (
    raw.includes("\0") ||
    /(^|[\\/])\.\.([\\/]|$)/.test(raw) ||
    decoded.includes("../") ||
    decoded.includes("..\\") ||
    decoded.includes("%2e%2e") ||
    decoded.includes("%2f") ||
    decoded.includes("%5c") ||
    /^[a-z]:[\\/]/i.test(raw)
  );
};

export const assertSafeStoragePath = (path: string): string => {
  const normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/").trim();
  if (!normalized) throw new Error("Storage path is empty.");
  if (hasPathTraversal(normalized)) throw new Error("Storage path contains unsafe traversal.");
  if (/^[a-z]+:\/\//i.test(normalized) || /^[a-z]:\//i.test(normalized)) throw new Error("Storage path cannot be absolute or protocol-based.");
  const pathWithoutLeadingSlash = normalized.replace(/^\/+/, "");
  if (pathWithoutLeadingSlash.split("/").some((segment) => segment === "." || segment === ".." || !segment.trim())) throw new Error("Storage path contains unsafe segments.");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
