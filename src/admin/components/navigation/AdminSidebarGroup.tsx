import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { AdminNavigationBadges } from "../../hooks/useAdminNavigationBadges";
import type { ResolvedAdminNavigationGroup } from "../../navigation/AdminNavigationRegistry";
import type { AdminSidebarMode } from "../../navigation/adminNavigationTypes";
import { AdminSidebarItem } from "./AdminSidebarItem";

interface AdminSidebarGroupProps {
  group: ResolvedAdminNavigationGroup;
  mode: AdminSidebarMode;
  badges: AdminNavigationBadges;
  onNavigate?: () => void;
  forceExpanded?: boolean;
}

export function AdminSidebarGroup({ group, mode, badges, onNavigate, forceExpanded = false }: AdminSidebarGroupProps) {
  const expanded = mode === "expanded";
  const { pathname } = useLocation();
  const [open, setOpen] = useState(group.defaultExpanded);
  const hasActiveEntry = group.entries.some((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`));
  const visible = !expanded || forceExpanded || hasActiveEntry || open;
  return (
    <section className="grid gap-1" aria-labelledby={expanded ? `admin-nav-${group.groupKey}` : undefined}>
      {expanded ? (
        <h2 id={`admin-nav-${group.groupKey}`}>
          <button type="button" onClick={() => setOpen(!open)} disabled={hasActiveEntry || forceExpanded}
            aria-expanded={visible} aria-controls={`admin-nav-items-${group.groupKey}`}
            className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-xs font-semibold text-white/65 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-anm-gold">
            {group.label}
            <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${visible ? "" : "-rotate-90"}`} />
          </button>
        </h2>
      ) : (
        <div className="mx-auto my-1 h-px w-8 bg-white/12" aria-hidden />
      )}
      <div id={`admin-nav-items-${group.groupKey}`} className={visible ? "grid gap-1" : "hidden"}>
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
