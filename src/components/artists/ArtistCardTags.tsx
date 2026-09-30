import { Badge } from "../ui/Badge";

interface ArtistCardTagsProps {
  tags?: readonly string[];
  maxTags?: number;
  fallback?: string;
  className?: string;
}

export function ArtistCardTags({ tags, maxTags = 3, fallback, className }: ArtistCardTagsProps) {
  const visibleTags = (tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, Math.max(0, maxTags));

  const displayTags = visibleTags.length > 0 ? visibleTags : fallback ? [fallback] : [];
  if (displayTags.length === 0) return null;

  return (
    <div className={className ?? "mt-5 flex flex-wrap gap-2"}>
      {displayTags.map((tag) => (
        <Badge key={tag} variant="purple" className="max-w-full truncate capitalize">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
