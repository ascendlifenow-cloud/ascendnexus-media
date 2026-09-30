import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cx } from "../../utils/format";
import { getButtonClassName } from "../../utils/themeUtils";
import type { HeaderCTAConfig } from "./headerTypes";

interface HeaderCTAProps {
  cta?: HeaderCTAConfig;
  onNavigate?: () => void;
  className?: string;
}

export function HeaderCTA({ cta, onNavigate, className }: HeaderCTAProps) {
  if (!cta || cta.enabled === false) return null;

  return (
    <Link
      to={cta.href}
      onClick={onNavigate}
      className={cx(
        getButtonClassName("primary", "md"),
        className,
      )}
    >
      {cta.label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
