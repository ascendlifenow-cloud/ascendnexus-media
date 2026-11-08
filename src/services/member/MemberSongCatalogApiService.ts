import type { ArtistPublicProfile } from "../../models/artist";
import type { PublicSongDetail, PublicSongRelease } from "../../models/release";

const request = async <T>(path: string): Promise<T> => {
  const base = String(import.meta.env?.VITE_API_URL || "").replace(/\/+$/, "");
  const response = await fetch(`${base}${path}`, {
    credentials: "include", cache: "no-store", headers: { "X-Auth-Scope": "member" },
  });
  const payload = await response.json() as { success: boolean; data: T; errors?: string[] };
  if (!response.ok || !payload.success) throw new Error(payload.errors?.[0] ?? "Member song catalog is unavailable.");
  return payload.data;
};

export const memberSongCatalogApiService = {
  catalog: () => request<{ releases: PublicSongRelease[]; artists: ArtistPublicProfile[] }>("/api/member/songs"),
  detail: (slug: string) => request<PublicSongDetail>(`/api/member/songs/${encodeURIComponent(slug)}`),
};
