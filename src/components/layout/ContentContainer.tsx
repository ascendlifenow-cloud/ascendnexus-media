import type { ReactNode } from "react";
import { cx } from "../../utils/format";

interface ContentContainerProps {
  children: ReactNode;
  className?: string;
}

export function ContentContainer({ children, className }: ContentContainerProps) {
  return <div className={cx("anm-container", className)}>{children}</div>;
}
