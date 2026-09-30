import { AlertTriangle } from "lucide-react";
import type { MediaAssetCompatibilityResult } from "../../../utils/media/mediaAssetLinkUtils";

export function MediaAssetCompatibilityWarning({ compatibility }: { compatibility?: MediaAssetCompatibilityResult | null }) {
  if (!compatibility || (!compatibility.warnings.length && !compatibility.blockingIssues.length)) return null;
  const messages = [...compatibility.blockingIssues, ...compatibility.warnings];
  return (
    <div className="rounded-md border border-anm-pink/20 bg-anm-pink/10 p-3 text-sm text-white/72">
      <div className="flex items-center gap-2 font-semibold text-pink-100">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        Compatibility Notice
      </div>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {messages.map((message) => <li key={message}>{message}</li>)}
      </ul>
    </div>
  );
}
