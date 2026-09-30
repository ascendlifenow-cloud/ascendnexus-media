import type { ReactNode } from "react";
import { Music2 } from "lucide-react";
import { FallbackGlowPanel } from "./FallbackGlowPanel";
import { RouteFallbackActions, type RouteFallbackAction } from "./RouteFallbackActions";
import { cx } from "../../utils/format";

type PublicEmptyStateVariant = "default" | "compact" | "inline";

interface PublicEmptyStateProps {
  title: string;
  message: string;
  action?: RouteFallbackAction;
  secondaryAction?: RouteFallbackAction;
  icon?: ReactNode;
  variant?: PublicEmptyStateVariant;
  className?: string;
}

export function PublicEmptyState({
  title,
  message,
  action,
  secondaryAction,
  icon,
  variant = "default",
  className,
}: PublicEmptyStateProps) {
  const content = (
    <>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-white/12 bg-white/[0.075] text-anm-gold shadow-anm-soft-glow">
        {icon ?? <Music2 className="h-7 w-7" aria-hidden="true" />}
      </div>
      <h2 className={cx("mt-5 font-semibold leading-tight text-white", variant === "compact" ? "text-xl" : "text-2xl sm:text-3xl")}>{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:text-base sm:leading-7">{message}</p>
      <RouteFallbackActions primaryAction={action} secondaryAction={secondaryAction} />
    </>
  );

  if (variant === "inline") {
    return (
      <div className={cx("flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.04] p-8 text-center", className)}>
        {content}
      </div>
    );
  }

  return <FallbackGlowPanel className={cx(variant === "compact" && "max-w-3xl py-8", className)}>{content}</FallbackGlowPanel>;
}
