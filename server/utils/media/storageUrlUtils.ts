export const encodeStoragePath = (storagePath: string): string =>
  storagePath.split("/").map((segment) => encodeURIComponent(segment)).join("/");

export const joinBaseUrlAndPath = (baseUrl: string, storagePath: string): string =>
  `${baseUrl.replace(/\/+$/, "")}/${encodeStoragePath(storagePath.replace(/^\/+/, ""))}`;

export const isPublicStoragePath = (storagePath: string, publicPrefix: string): boolean =>
  storagePath === publicPrefix || storagePath.startsWith(`${publicPrefix.replace(/\/+$/, "")}/`);
