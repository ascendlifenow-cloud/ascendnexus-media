import { UserRound } from "lucide-react";
import { cx } from "../../utils/format";

interface IdentityBadgeProps {
  label: string;
  className?: string;
}

export function IdentityBadge({ label, className }: IdentityBadgeProps) {
  return (
    <span className={cx("inline-flex min-w-0 items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white", className)}>
      <UserRound className="h-3.5 w-3.5 shrink-0 text-cyanGlow" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
