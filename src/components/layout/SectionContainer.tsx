import type { ElementType, ReactNode } from "react";
import { cx } from "../../utils/format";

interface SectionContainerProps {
  children: ReactNode;
  as?: ElementType;
  id?: string;
  className?: string;
  innerClassName?: string;
  "aria-labelledby"?: string;
}

export function SectionContainer({
  children,
  as: Component = "section",
  id,
  className,
  innerClassName,
  "aria-labelledby": ariaLabelledBy,
}: SectionContainerProps) {
  return (
    <Component id={id} className={cx("anm-section", className)} aria-labelledby={ariaLabelledBy}>
      <div className={cx("anm-container", innerClassName)}>{children}</div>
    </Component>
  );
}
