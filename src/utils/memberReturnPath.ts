export function memberReturnPath(value: string | null | undefined): string | null {
  if (!value || value.length > 2048 || !value.startsWith("/")) return null;
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const base = "https://member-return.invalid";
    const url = new URL(value, base);
    const decodedPath = decodeURIComponent(url.pathname);
    if (url.origin !== base || /[\\\u0000-\u0020\u007f]|%2f|%5c/i.test(decodedPath) || /%2f|%5c/i.test(url.pathname)) return null;
    if (url.pathname !== "/member" && !url.pathname.startsWith("/member/")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
