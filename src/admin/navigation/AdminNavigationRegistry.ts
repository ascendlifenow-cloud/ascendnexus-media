import {
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  DatabaseZap,
  FileClock,
  FileMusic,
  Home,
  Images,
  Library,
  ListChecks,
  RadioTower,
  Rocket,
  Search,
  ServerCog,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  UserCog,
  UsersRound,
} from "lucide-react";
import { adminNavigationGroups } from "./adminNavigationGroups";
import type { AdminNavigationEntry, AdminNavigationGroup } from "./adminNavigationTypes";

export const adminNavigationEntries: AdminNavigationEntry[] = [
  { navigationKey: "dashboard", label: "Dashboard", path: "/admin/dashboard", icon: BarChart3, groupKey: "overview", order: 10 },
  { navigationKey: "artwork_collage", label: "Artwork Collage", path: "/admin/artwork-collage", icon: Images, groupKey: "overview", order: 15, requiredPermission: "media.read" },
  { navigationKey: "operations", label: "Operations", path: "/admin/operations", icon: CalendarDays, groupKey: "overview", order: 20, requiredPermission: "operations.read" },

  { navigationKey: "artists", label: "Artists", path: "/admin/artists", icon: UsersRound, groupKey: "content", order: 10, requiredPermission: "artists.read" },
  { navigationKey: "releases", label: "Releases", path: "/admin/releases", icon: FileMusic, groupKey: "content", order: 20, requiredPermission: "releases.read" },
  { navigationKey: "gallery", label: "Gallery", path: "/admin/gallery", icon: Images, groupKey: "content", order: 30, requiredPermission: "gallery.read" },
  { navigationKey: "homepage", label: "Homepage", path: "/admin/homepage", icon: Home, groupKey: "content", order: 40, requiredPermission: "homepage.read" },

  { navigationKey: "media_library", label: "Media Library", path: "/admin/media", icon: Library, groupKey: "media_operations", order: 10, requiredPermission: "media.read", activeMatch: ["/admin/media", "/admin/media/new"] },
  { navigationKey: "media_review", label: "Media Review", path: "/admin/media-review", icon: ListChecks, groupKey: "media_operations", order: 20, requiredPermission: "media.read", badgeSource: "media_review", activeMatch: ["/admin/media-review", "/admin/media/review"] },
  { navigationKey: "media_processing", label: "Media Processing", path: "/admin/media/processing", icon: RadioTower, groupKey: "media_operations", order: 30, requiredPermission: "media.processing.read" },

  { navigationKey: "publishing_queue", label: "Publication Queue", path: "/admin/publishing-queue", icon: Sparkles, groupKey: "publishing", order: 10, requiredPermission: "operations.read" },
  { navigationKey: "release_calendar", label: "Release Calendar", path: "/admin/release-calendar", icon: CalendarDays, groupKey: "publishing", order: 20, requiredPermission: "operations.read" },
  { navigationKey: "distribution", label: "Distribution", path: "/admin/distribution", icon: Share2, groupKey: "publishing", order: 30, requiredPermission: "distribution.read" },
  { navigationKey: "seo", label: "SEO", path: "/admin/seo", icon: Search, groupKey: "publishing", order: 40, requiredPermission: "metadata.read" },

  { navigationKey: "members", label: "Members", path: "/admin/members", icon: UsersRound, groupKey: "members", order: 10, requiredPermission: "users.read" },
  { navigationKey: "membership_tiers", label: "Membership Tiers", path: "/admin/membership-tiers", icon: ShieldCheck, groupKey: "members", order: 20, requiredPermission: "users.read" },
  { navigationKey: "entitlements", label: "Entitlements", path: "/admin/entitlements", icon: ListChecks, groupKey: "members", order: 30, requiredPermission: "users.read" },
  { navigationKey: "member_experience", label: "Member Experience", path: "/admin/member-experience", icon: UserCog, groupKey: "members", order: 40, requiredAnyPermissions: ["users.read", "system.health.read"] },
  { navigationKey: "billing", label: "Billing", path: "/admin/billing", icon: FileClock, groupKey: "members", order: 50, requiredPermission: "users.read" },

  { navigationKey: "observability", label: "Observability", path: "/admin/system/observability", icon: Activity, groupKey: "system", order: 10, requiredPermission: "observability.read" },
  { navigationKey: "deployment", label: "Deployment", path: "/admin/system/deployment", icon: Rocket, groupKey: "system", order: 20, requiredPermission: "deployment.read" },
  { navigationKey: "launch_readiness", label: "Launch Readiness", path: "/admin/launch-readiness", icon: Rocket, groupKey: "system", order: 30, requiredPermission: "launch.certification.read" },
  { navigationKey: "experience_launch", label: "Experience Launch", path: "/admin/launch-readiness/experience", icon: ListChecks, groupKey: "system", order: 35, requiredPermission: "launch.certification.read" },
  { navigationKey: "admin_operations_launch", label: "Admin Launch", path: "/admin/launch-readiness/admin-operations", icon: ListChecks, groupKey: "system", order: 36, requiredPermission: "launch.certification.read" },
  { navigationKey: "infrastructure_launch", label: "Infrastructure Launch", path: "/admin/launch-readiness/infrastructure", icon: ServerCog, groupKey: "system", order: 37, requiredPermission: "launch_infrastructure.read" },
  { navigationKey: "security_recovery_launch", label: "Security Recovery", path: "/admin/launch-readiness/security-recovery", icon: ShieldCheck, groupKey: "system", order: 38, requiredPermission: "launch_security.read" },
  { navigationKey: "final_launch_signoff", label: "Final Sign-Off", path: "/admin/launch-readiness/final-signoff", icon: Rocket, groupKey: "system", order: 39, requiredPermission: "launch_final.read" },
  { navigationKey: "security", label: "Security", path: "/admin/system/authentication", icon: ShieldCheck, groupKey: "system", order: 40, requiredAnyPermissions: ["security.read", "users.manage"] },
  { navigationKey: "audit", label: "Audit Log", path: "/admin/audit", icon: FileClock, groupKey: "system", order: 50, requiredPermission: "audit.read" },
  { navigationKey: "admin_users", label: "Admin Users", path: "/admin/users", icon: UserCog, groupKey: "system", order: 60, requiredPermission: "users.read" },
  { navigationKey: "intelligence", label: "Intelligence", path: "/admin/intelligence", icon: Brain, groupKey: "system", order: 70, requiredPermission: "intelligence.read" },
  { navigationKey: "dev_seeds", label: "Dev Seeds", path: "/admin/development/seeds", icon: DatabaseZap, groupKey: "system", order: 80, requiredPermission: "users.manage" },
  { navigationKey: "settings", label: "Settings", path: "/admin/settings", icon: Settings, groupKey: "system", order: 90, requiredPermission: "site_settings.read" },
];

export interface ResolvedAdminNavigationGroup extends AdminNavigationGroup {
  entries: AdminNavigationEntry[];
}

export const getAdminNavigationGroups = (
  hasPermission: (permission: string) => boolean,
  hasAnyPermission?: (permissions: string[]) => boolean,
): ResolvedAdminNavigationGroup[] =>
  adminNavigationGroups
    .map((group) => ({
      ...group,
      entries: adminNavigationEntries
        .filter((entry) => entry.groupKey === group.groupKey)
        .filter((entry) => entry.isVisible !== false)
        .filter((entry) => !entry.requiredPermission || hasPermission(entry.requiredPermission))
        .filter((entry) => !entry.requiredAnyPermissions?.length || (hasAnyPermission ? hasAnyPermission(entry.requiredAnyPermissions) : entry.requiredAnyPermissions.some(hasPermission)))
        .sort((left, right) => left.order - right.order),
    }))
    .filter((group) => group.entries.length > 0)
    .sort((left, right) => left.order - right.order);
