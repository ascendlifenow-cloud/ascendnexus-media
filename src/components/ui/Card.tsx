import type { HTMLAttributes, ReactNode } from "react";
import { getCardClassName, type CardVariant } from "../../utils/themeUtils";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "div" | "section";
  variant?: CardVariant;
  interactive?: boolean;
  children: ReactNode;
}

export function Card({ as: Component = "div", variant = "default", interactive = false, className, children, ...props }: CardProps) {
  return (
    <Component className={getCardClassName(variant, interactive, className)} {...props}>
      {children}
    </Component>
  );
}
