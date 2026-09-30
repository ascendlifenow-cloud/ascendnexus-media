import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { AdminSidebarMode } from "../../navigation/adminNavigationTypes";

interface AdminSidebarToggleProps {
  mode: AdminSidebarMode;
  onToggle: () => void;
}

export function AdminSidebarToggle({ mode, onToggle }: AdminSidebarToggleProps) {
  const expanded = mode === "expanded";
  return (
    <button
      type="button"
      className="anm-focus inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.045] text-white/70 transition hover:border-white/20 hover:bg-white/[0.085] hover:text-white"
      aria-label={expanded ? "Collapse admin navigation" : "Expand admin navigation"}
      title={expanded ? "Collapse navigation" : "Expand navigation"}
      onClick={onToggle}
    >
      {expanded ? <PanelLeftClose className="h-4 w-4" aria-hidden /> : <PanelLeftOpen className="h-4 w-4" aria-hidden />}
    </button>
  );
}
