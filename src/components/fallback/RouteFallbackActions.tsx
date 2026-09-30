import type { ReactNode } from "react";
import { Button } from "../ui/Button";
import { LinkButton } from "../ui/LinkButton";
import type { ButtonVariant } from "../../utils/themeUtils";

export interface RouteFallbackAction {
  label: string;
  to?: string;
  onClick?: () => void;
  icon?: ReactNode;
  variant?: ButtonVariant;
}

interface RouteFallbackActionsProps {
  primaryAction?: RouteFallbackAction;
  secondaryAction?: RouteFallbackAction;
  actions?: RouteFallbackAction[];
  className?: string;
}

const renderAction = (action: RouteFallbackAction, index: number) => {
  const variant = action.variant ?? (index === 0 ? "primary" : "glass");

  if (action.to) {
    return (
      <LinkButton key={`${action.label}-${index}`} to={action.to} variant={variant} size="lg" className="w-full sm:w-auto">
        {action.icon}
        {action.label}
      </LinkButton>
    );
  }

  if (action.onClick) {
    return (
      <Button key={`${action.label}-${index}`} type="button" variant={variant} size="lg" className="w-full sm:w-auto" onClick={action.onClick}>
        {action.icon}
        {action.label}
      </Button>
    );
  }

  return null;
};

export function RouteFallbackActions({ primaryAction, secondaryAction, actions, className }: RouteFallbackActionsProps) {
  const resolvedActions = actions ?? [primaryAction, secondaryAction].filter(Boolean);

  if (!resolvedActions.length) return null;

  return (
    <div className={["mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row", className].filter(Boolean).join(" ")}>
      {resolvedActions.map((action, index) => (action ? renderAction(action, index) : null))}
    </div>
  );
}
