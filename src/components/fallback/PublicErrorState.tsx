import { AlertTriangle, Home } from "lucide-react";
import { FallbackGlowPanel } from "./FallbackGlowPanel";
import { RouteFallbackActions, type RouteFallbackAction } from "./RouteFallbackActions";
import { cx } from "../../utils/format";

interface PublicErrorStateProps {
  title?: string;
  message?: string;
  primaryAction?: RouteFallbackAction;
  secondaryAction?: RouteFallbackAction;
  errorCode?: string;
  headingLevel?: "h1" | "h2";
  className?: string;
}

export function PublicErrorState({
  title = "Something went wrong",
  message = "We could not load this Ascend Nexus Media content right now.",
  primaryAction = { label: "Go Home", to: "/", icon: <Home className="h-4 w-4" aria-hidden="true" /> },
  secondaryAction,
  errorCode,
  headingLevel = "h1",
  className,
}: PublicErrorStateProps) {
  const HeadingTag = headingLevel;

  return (
    <FallbackGlowPanel className={cx("relative overflow-hidden", className)}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-md border border-anm-gold/25 bg-anm-sunrise/16 text-anm-gold shadow-anm-sunrise-glow">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      {errorCode ? <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-anm-pink">{errorCode}</p> : null}
      <HeadingTag className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-5xl">{title}</HeadingTag>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{message}</p>
      <RouteFallbackActions primaryAction={primaryAction} secondaryAction={secondaryAction} />
    </FallbackGlowPanel>
  );
}
