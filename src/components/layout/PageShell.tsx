import type { ReactNode } from "react";
import { cx } from "../../utils/format";

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return <main className={cx("anm-page-shell", className)}>{children}</main>;
}
