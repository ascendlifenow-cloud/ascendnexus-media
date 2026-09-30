import type { MouseEvent, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { useAnalytics } from "../../hooks/useAnalytics";
import { getButtonClassName, type ButtonSize, type ButtonVariant } from "../../utils/themeUtils";

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function LinkButton({ variant = "primary", size = "md", className, children, ...props }: LinkButtonProps) {
  const analytics = useAnalytics();
  const label = typeof children === "string" ? children : typeof props["aria-label"] === "string" ? props["aria-label"] : "CTA";
  const targetRoute = typeof props.to === "string" ? props.to : props.to.pathname;
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    void analytics.trackCtaClick(label, targetRoute, {
      sourceComponent: "LinkButton",
    });
    props.onClick?.(event);
  };

  return (
    <Link className={getButtonClassName(variant, size, className)} {...props} onClick={handleClick}>
      {children}
    </Link>
  );
}
