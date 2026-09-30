import type { AdminNavigationBadges } from "../../hooks/useAdminNavigationBadges";
import type { ResolvedAdminNavigationGroup } from "../../navigation/AdminNavigationRegistry";
import type { AdminSidebarMode } from "../../navigation/adminNavigationTypes";
import { AdminSidebarItem } from "./AdminSidebarItem";

interface AdminSidebarGroupProps {
  group: ResolvedAdminNavigationGroup;
  mode: AdminSidebarMode;
  badges: AdminNavigationBadges;
  onNavigate?: () => void;
}

export function AdminSidebarGroup({ group, mode, badges, onNavigate }: AdminSidebarGroupProps) {
  const expanded = mode === "expanded";
  return (
    <section className="grid gap-1" aria-labelledby={expanded ? `admin-nav-${group.groupKey}` : undefined}>
      {expanded ? (
        <h2 id={`admin-nav-${group.groupKey}`} className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/34">
          {group.label}
        </h2>
      ) : (
        <div className="mx-auto my-1 h-px w-8 bg-white/12" aria-hidden />
      )}
      <div className="grid gap-1">
        {group.entries.map((entry) => (
          <AdminSidebarItem
            key={entry.navigationKey}
            entry={entry}
            mode={mode}
            badge={entry.badgeSource ? badges[entry.badgeSource] : undefined}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}
