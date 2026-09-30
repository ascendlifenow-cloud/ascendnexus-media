import { Link } from "react-router-dom";
import { cx } from "../../utils/format";
import { isInternalHref } from "./footerUtils";

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function FooterLink({ href, children, ariaLabel, className }: FooterLinkProps) {
  const classes = cx(
    "inline-flex min-h-9 items-center rounded-md text-sm text-white/66 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-cyanGlow/70",
    className,
  );

  if (isInternalHref(href)) {
    return (
      <Link to={href} aria-label={ariaLabel} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer" className={classes}>
      {children}
    </a>
  );
}
