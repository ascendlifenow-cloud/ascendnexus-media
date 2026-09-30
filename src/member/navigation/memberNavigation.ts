import { Bell, Clock3, Heart, History, Home, Images, Layers3, LockKeyhole, PlayCircle, Search, Settings, ShieldCheck, Sparkles, Star, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MemberDashboardResponse } from "../services/memberPortalTypes";

export interface MemberNavigationItem {
  navigationKey: string;
  label: string;
  path: string;
  icon: LucideIcon;
  requiredEntitlement?: string;
  featureStatus: "available" | "coming_soon";
  showAsUpgradeTeaser?: boolean;
  order: number;
  group: "core" | "content" | "account" | "readiness";
  mobileVisible: boolean;
}

export const buildMemberNavigation = (dashboard?: MemberDashboardResponse): MemberNavigationItem[] => {
  const entitlements = new Set((dashboard?.capabilities ?? []).filter((capability) => capability.status === "available").map((capability) => capability.category));
  const exclusiveAvailable = Boolean(dashboard?.exclusiveContent.length) || entitlements.has("Early Access");
  const items: MemberNavigationItem[] = [
    { navigationKey: "dashboard", label: "Dashboard", path: "/member", icon: Home, featureStatus: "available", order: 1, group: "core", mobileVisible: true },
    { navigationKey: "home", label: "Home", path: "/member/home", icon: Home, featureStatus: "available", order: 2, group: "core", mobileVisible: true },
    { navigationKey: "artists", label: "Artists", path: "/member/artists", icon: UserRound, featureStatus: "available", order: 3, group: "content", mobileVisible: true },
    { navigationKey: "songs", label: "Songs", path: "/member/songs", icon: PlayCircle, featureStatus: "available", order: 4, group: "content", mobileVisible: true },
    { navigationKey: "artwork", label: "Artwork", path: "/member/artwork", icon: Images, featureStatus: "available", order: 5, group: "content", mobileVisible: true },
    { navigationKey: "recommendations", label: "Recommendations", path: "/member/recommendations", icon: Sparkles, featureStatus: "available", order: 6, group: "content", mobileVisible: true },
    { navigationKey: "feed", label: "Feed", path: "/member/feed", icon: Layers3, featureStatus: "available", order: 7, group: "content", mobileVisible: true },
    { navigationKey: "early-access", label: "Early Access", path: "/member/early-access", icon: Clock3, featureStatus: "available", showAsUpgradeTeaser: !dashboard?.earlyAccess.length, order: 8, group: "content", mobileVisible: true },
    { navigationKey: "exclusive-content", label: "Exclusive", path: "/member/exclusive-content", icon: Star, featureStatus: "available", showAsUpgradeTeaser: !exclusiveAvailable, order: 9, group: "content", mobileVisible: true },
    { navigationKey: "membership", label: "Membership", path: "/member/membership", icon: ShieldCheck, featureStatus: "available", order: 10, group: "account", mobileVisible: true },
    { navigationKey: "profile", label: "Profile", path: "/member/profile", icon: UserRound, featureStatus: "available", order: 11, group: "account", mobileVisible: false },
    { navigationKey: "preferences", label: "Preferences", path: "/member/preferences", icon: Settings, featureStatus: "available", order: 7, group: "account", mobileVisible: false },
    { navigationKey: "security", label: "Security", path: "/member/security", icon: LockKeyhole, featureStatus: "available", order: 8, group: "account", mobileVisible: false },
    { navigationKey: "sessions", label: "Sessions", path: "/member/sessions", icon: PlayCircle, featureStatus: "available", order: 9, group: "account", mobileVisible: false },
    { navigationKey: "favorites", label: "Favorites", path: "/member/favorites", icon: Heart, featureStatus: "available", order: 10, group: "readiness", mobileVisible: false },
    { navigationKey: "following", label: "Following", path: "/member/following", icon: Images, featureStatus: "available", order: 11, group: "readiness", mobileVisible: false },
    { navigationKey: "history", label: "History", path: "/member/history", icon: History, featureStatus: "available", order: 12, group: "readiness", mobileVisible: false },
    { navigationKey: "playlists", label: "Playlists", path: "/member/playlists", icon: PlayCircle, featureStatus: "available", order: 13, group: "readiness", mobileVisible: false },
    { navigationKey: "notifications", label: "Notifications", path: "/member/notifications", icon: Bell, featureStatus: "available", order: 14, group: "readiness", mobileVisible: false },
    { navigationKey: "saved-searches", label: "Saved Searches", path: "/member/saved-searches", icon: Search, featureStatus: "available", order: 15, group: "readiness", mobileVisible: false },
    { navigationKey: "collections", label: "Collections", path: "/member/collections", icon: Layers3, featureStatus: "available", order: 16, group: "readiness", mobileVisible: false },
  ];
  return items.sort((a, b) => a.order - b.order);
};
