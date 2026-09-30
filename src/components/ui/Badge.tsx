import type { HTMLAttributes, ReactNode } from "react";
import { getBadgeClassName, type BadgeVariant } from "../../utils/themeUtils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span className={getBadgeClassName(variant, className)} {...props}>
      {children}
    </span>
  );
}
