import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "../../utils/format";
import { getButtonClassName, type ButtonSize, type ButtonVariant } from "../../utils/themeUtils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", isLoading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={getButtonClassName(disabled && !isLoading ? "disabled" : variant, size, cx(isLoading && "animate-pulse", className))}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
