import { Music2, Sparkles } from "lucide-react";
import { Badge } from "../ui/Badge";

interface ArtistCardMetaProps {
  primaryGenre?: string;
  badgeLabel?: string;
  compact?: boolean;
}

export function ArtistCardMeta({ primaryGenre, badgeLabel = "AI Persona", compact = false }: ArtistCardMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {badgeLabel ? (
        <Badge variant="glass" className={compact ? "px-2 py-1 text-[0.68rem] uppercase" : "uppercase text-cyan-100"}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {badgeLabel}
        </Badge>
      ) : null}
      {primaryGenre ? (
        <Badge variant="sunrise" className={compact ? "px-2 py-1 text-[0.68rem]" : "max-w-full truncate"}>
          <Music2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{primaryGenre}</span>
        </Badge>
      ) : null}
    </div>
  );
}
