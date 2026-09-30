const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Playback session request failed.");
  return payload.data as T;
};

export const playbackSessionApiService = {
  async create(input: { authorizationId: string; mediaAssetId: string; contentId: string; clientCategory?: string }) {
    return parse<Record<string, unknown>>(await fetch("/api/member/playback/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Scope": "member" },
      credentials: "include",
      body: JSON.stringify(input),
    }));
  },
  async update(playbackSessionId: string, status: "starting" | "playing" | "paused" | "completed" | "failed") {
    return parse<Record<string, unknown>>(await fetch(`/api/member/playback/sessions/${encodeURIComponent(playbackSessionId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Auth-Scope": "member" },
      credentials: "include",
      body: JSON.stringify({ status }),
    }));
  },
  async complete(playbackSessionId: string) {
    return parse<Record<string, unknown>>(await fetch(`/api/member/playback/sessions/${encodeURIComponent(playbackSessionId)}`, {
      method: "DELETE",
      headers: { "X-Auth-Scope": "member" },
      credentials: "include",
    }));
  },
};
