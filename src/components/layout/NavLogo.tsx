import { AudioLines } from "lucide-react";
import { Link } from "react-router-dom";
import { cx } from "../../utils/format";

interface NavLogoProps {
  onNavigate?: () => void;
  className?: string;
}

export function NavLogo({ onNavigate, className }: NavLogoProps) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      aria-label="Ascend Nexus Media home"
      className={cx(
        "group flex min-w-0 items-center gap-3 rounded-md transition anm-focus",
        className,
      )}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-anm-blue/30 bg-white/10 shadow-anm-soft-glow backdrop-blur transition group-hover:border-anm-gold/60 group-hover:bg-white/14">
        <AudioLines className="h-6 w-6 text-anm-blue" aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100">Ascend Nexus</span>
        <span className="block text-xs uppercase tracking-[0.34em] text-white/58">Media</span>
      </span>
    </Link>
  );
}
