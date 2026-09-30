export const validatePublicMediaUrl = (url: string | null | undefined, allowDataImage = true): boolean => {
  const value = url?.trim() ?? "";
  if (!value) return false;
  const decoded = safeDecode(value).trim().toLowerCase();
  if (/^(javascript|vbscript|file):/i.test(decoded)) return false;
  if (decoded.startsWith("data:") && !(allowDataImage && decoded.startsWith("data:image/"))) return false;
  if (/credential|secret|token|apikey|api_key|authorization|cookie/i.test(decoded)) return false;
  if (decoded.includes("<script") || decoded.includes("%3cscript")) return false;
  return value.startsWith("/") || value.startsWith("./") || value.startsWith("../") || value.startsWith("https://") || value.startsWith("http://") || (allowDataImage && value.startsWith("data:image/"));
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

