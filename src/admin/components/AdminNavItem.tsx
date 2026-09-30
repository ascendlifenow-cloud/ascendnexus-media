import { NavLink } from "react-router-dom";
import type { AdminNavItemConfig } from "./adminNav";
import { cx } from "../../utils/format";

interface AdminNavItemProps {
  item: AdminNavItemConfig;
  onNavigate?: () => void;
}

export function AdminNavItem({ item, onNavigate }: AdminNavItemProps) {
  const Icon = item.icon;

  if (!item.enabled) {
    return (
      <span className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-md border border-transparent px-3 text-sm font-semibold text-white/32">
        <Icon className="h-4 w-4" aria-hidden />
        {item.label}
      </span>
    );
  }

  return (
    <NavLink
      to={item.route}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          "anm-focus flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm font-semibold transition",
          isActive
            ? "border-anm-pink/35 bg-anm-pink/14 text-white shadow-anm-pink-glow"
            : "border-transparent text-white/70 hover:border-white/12 hover:bg-white/[0.075] hover:text-white",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-4 w-4" aria-hidden />
          <span>{item.label}</span>
          {isActive ? <span className="ml-auto h-2 w-2 rounded-full bg-anm-gold" aria-hidden /> : null}
        </>
      )}
    </NavLink>
  );
}
