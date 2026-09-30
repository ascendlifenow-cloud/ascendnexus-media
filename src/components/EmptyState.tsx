import type { ReactNode } from "react";
import { PublicEmptyState } from "./fallback/PublicEmptyState";

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, message, icon, className }: EmptyStateProps) {
  return <PublicEmptyState title={title} message={message} icon={icon} variant="inline" className={className} />;
}
