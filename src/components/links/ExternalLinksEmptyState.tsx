interface ExternalLinksEmptyStateProps {
  message?: string;
}

export function ExternalLinksEmptyState({ message = "Platform links will appear here when public destinations are configured." }: ExternalLinksEmptyStateProps) {
  return <p className="mt-5 max-w-2xl text-base leading-7 text-white/64">{message}</p>;
}
