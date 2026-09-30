import type { ReactNode } from "react";
import { cx } from "../../utils/format";

interface CoverArtGridProps {
  children: ReactNode;
  className?: string;
}

export function CoverArtGrid({ children, className }: CoverArtGridProps) {
  return <div className={cx("grid gap-6 sm:grid-cols-2 xl:grid-cols-3", className)}>{children}</div>;
}
