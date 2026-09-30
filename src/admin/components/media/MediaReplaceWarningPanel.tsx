import { AlertTriangle } from "lucide-react";

export function MediaReplaceWarningPanel({
  dependencyCount = 0,
  publiclyReferenced = false,
  warnings = [],
}: {
  dependencyCount?: number;
  publiclyReferenced?: boolean;
  warnings?: readonly string[];
}) {
  const messages = [
    dependencyCount > 0 ? `This asset is used in ${dependencyCount} linked location${dependencyCount === 1 ? "" : "s"}.` : "",
    publiclyReferenced ? "This asset may be visible on public pages. Public fields update only if the new version passes visibility checks." : "",
    ...warnings,
  ].filter(Boolean);
  if (!messages.length) return null;
  return (
    <div className="rounded-md border border-anm-gold/25 bg-anm-gold/10 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-anm-gold">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        Replacement Warning
      </div>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-white/70">
        {messages.map((message) => <li key={message}>{message}</li>)}
      </ul>
    </div>
  );
}
