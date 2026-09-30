import { ArrowRight, Headphones } from "lucide-react";
import { LinkButton } from "./ui/LinkButton";

export interface CTAButtonConfig {
  label: string;
  to: string;
  ariaLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "glass";
}

interface CTAButtonGroupProps {
  primary?: CTAButtonConfig;
  secondary?: CTAButtonConfig;
}

export function CTAButtonGroup({ primary, secondary }: CTAButtonGroupProps) {
  if (!primary && !secondary) return null;

  return (
    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
      {primary ? (
        <LinkButton
          to={primary.to}
          variant={primary.variant ?? "primary"}
          size="lg"
          aria-label={primary.ariaLabel ?? primary.label}
          className="w-full sm:w-auto"
        >
          {primary.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </LinkButton>
      ) : null}
      {secondary ? (
        <LinkButton
          to={secondary.to}
          variant={secondary.variant ?? "glass"}
          size="lg"
          aria-label={secondary.ariaLabel ?? secondary.label}
          className="w-full sm:w-auto"
        >
          <Headphones className="h-4 w-4" aria-hidden="true" />
          {secondary.label}
        </LinkButton>
      ) : null}
    </div>
  );
}
