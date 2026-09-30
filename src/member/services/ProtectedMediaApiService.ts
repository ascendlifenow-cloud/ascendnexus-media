export interface ProtectedStreamAuthorization {
  authorized: boolean;
  authorizationReference?: string;
  deliveryMode?: string;
  streamEndpoint?: string;
  downloadEndpoint?: string;
  expiresAt?: string;
  mimeType?: string;
  duration?: number;
  rangeSupported?: boolean;
  contentLength?: number;
  refreshAllowed?: boolean;
  safeAccessState?: string;
}

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Protected media request failed.");
  return payload.data as T;
};

export const protectedMediaApiService = {
  async authorizeStream(mediaId: string, playbackContext: Record<string, unknown> = {}) {
    return parse<ProtectedStreamAuthorization>(await fetch(`/api/member/media/${encodeURIComponent(mediaId)}/stream-authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Scope": "member" },
      credentials: "include",
      body: JSON.stringify({ playbackContext }),
    }));
  },
  async authorizeDownload(mediaId: string) {
    return parse<ProtectedStreamAuthorization>(await fetch(`/api/member/media/${encodeURIComponent(mediaId)}/download-authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Scope": "member" },
      credentials: "include",
      body: "{}",
    }));
  },
};
