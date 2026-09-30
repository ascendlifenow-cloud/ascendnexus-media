import { memberAuthApiService, type MemberAuthSession } from "../member/MemberAuthApiService";

export type AuthenticationShellIdentity =
  | { kind: "guest" }
  | { kind: "member"; session: MemberAuthSession; displayName: string; membershipTier: string }
  | { kind: "admin" };

export const authShellChangedEvent = "anm-auth-shell-changed";

const routeMap = new Map<string, string>([
  ["/", "/member/home"],
  ["/artists", "/member/artists"],
  ["/songs", "/member/songs"],
  ["/releases", "/member/songs"],
  ["/artwork", "/member/artwork"],
  ["/artwork-collage", "/member/artwork"],
]);

const normalizeTier = (tier?: string) => tier?.trim() || "Free Member";

export class AuthenticationShellService {
  async getCurrentIdentity(): Promise<AuthenticationShellIdentity> {
    try {
      const session = await memberAuthApiService.session();
      return {
        kind: "member",
        session,
        displayName: session.member.displayName || "Member",
        membershipTier: normalizeTier(session.member.membershipTier),
      };
    } catch {
      return { kind: "guest" };
    }
  }

  getAuthenticatedRoute(pathname: string): string | undefined {
    if (routeMap.has(pathname)) return routeMap.get(pathname);
    if (pathname.startsWith("/artists/")) return pathname.replace(/^\/artists/, "/member/artists");
    if (pathname.startsWith("/songs/")) return pathname.replace(/^\/songs/, "/member/songs");
    if (pathname.startsWith("/releases/")) return pathname.replace(/^\/releases/, "/member/songs");
    return undefined;
  }

  announceAuthChange() {
    window.dispatchEvent(new CustomEvent(authShellChangedEvent));
    window.localStorage.setItem(authShellChangedEvent, String(Date.now()));
  }
}

export const authenticationShellService = new AuthenticationShellService();
