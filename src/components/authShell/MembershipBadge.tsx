import { ShieldCheck } from "lucide-react";
import { cx } from "../../utils/format";

interface MembershipBadgeProps {
  label: string;
  className?: string;
}

export function MembershipBadge({ label, className }: MembershipBadgeProps) {
  return (
    <span className={cx("inline-flex min-w-0 items-center gap-2 rounded-full border border-cyanGlow/30 bg-cyanGlow/12 px-3 py-1.5 text-xs font-semibold text-cyan-50", className)}>
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
