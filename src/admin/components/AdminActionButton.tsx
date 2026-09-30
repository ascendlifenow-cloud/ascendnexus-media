import type { ReactNode } from "react";
import { LinkButton } from "../../components/ui/LinkButton";
import type { ButtonVariant } from "../../utils/themeUtils";

interface AdminActionButtonProps {
  to: string;
  children: ReactNode;
  variant?: ButtonVariant;
}

export function AdminActionButton({ to, children, variant = "glass" }: AdminActionButtonProps) {
  return (
    <LinkButton to={to} variant={variant} size="sm">
      {children}
    </LinkButton>
  );
}
