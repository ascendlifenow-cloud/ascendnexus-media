import { NavLink, useLocation } from "react-router-dom";
import { cx } from "../../../utils/format";
import type { AdminNavigationEntry } from "../../navigation/adminNavigationTypes";

interface AdminSidebarItemProps {
  entry: AdminNavigationEntry;
  mode: "expanded" | "collapsed";
  badge?: number;
  onNavigate?: () => void;
}

const formatBadge = (value: number): string => value > 99 ? "99+" : String(value);

export function AdminSidebarItem({ entry, mode, badge, onNavigate }: AdminSidebarItemProps) {
  const Icon = entry.icon;
  const expanded = mode === "expanded";
  const location = useLocation();
  const activePaths = entry.activeMatch ?? [entry.path];
  const isRouteActive = activePaths.some((path) => location.pathname === path || (path !== "/admin/media" && location.pathname.startsWith(`${path}/`)));

  if (entry.isEnabled === false) {
    return (
      <span
        className={cx(
          "flex min-h-11 cursor-not-allowed items-center rounded-md border border-transparent text-sm font-semibold text-white/32",
          expanded ? "gap-3 px-3" : "justify-center px-2",
        )}
        title={entry.label}
        aria-label={`${entry.label} unavailable`}
      >
        <Icon className="h-4 w-4" aria-hidden />
        {expanded ? <span className="truncate">{entry.label}</span> : null}
      </span>
    );
  }

  return (
    <NavLink
      to={entry.path}
      onClick={onNavigate}
      title={expanded ? undefined : entry.label}
      aria-label={entry.label}
      aria-current={isRouteActive ? "page" : undefined}
      className={() =>
        cx(
          "anm-focus group relative flex min-h-11 items-center rounded-md border text-sm font-semibold transition",
          expanded ? "gap-3 px-3" : "justify-center px-2",
          isRouteActive
            ? "border-anm-pink/35 bg-anm-pink/14 text-white shadow-anm-pink-glow"
            : "border-transparent text-white/70 hover:border-white/12 hover:bg-white/[0.075] hover:text-white",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {expanded ? <span className="truncate">{entry.label}</span> : null}
      {badge && badge > 0 ? (
        <span
          className={cx(
            "rounded-full border border-anm-gold/30 bg-anm-gold/12 px-1.5 py-0.5 text-[0.62rem] font-black text-anm-gold",
            expanded ? "ml-auto" : "absolute -right-1 -top-1",
          )}
          aria-label={`${formatBadge(badge)} items need review`}
        >
          {formatBadge(badge)}
        </span>
      ) : null}
      {!expanded ? (
        <span className="pointer-events-none absolute left-[calc(100%+0.5rem)] z-50 hidden rounded-md border border-white/10 bg-anm-bg-soft px-2 py-1 text-xs font-semibold text-white shadow-xl group-hover:block group-focus-visible:block">
          {entry.label}
        </span>
      ) : null}
      {isRouteActive && !badge ? <span className={cx("h-2 w-2 rounded-full bg-anm-gold", expanded ? "ml-auto" : "absolute right-1 top-1")} aria-hidden /> : null}
    </NavLink>
  );
}
