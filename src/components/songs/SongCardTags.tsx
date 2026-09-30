import { Badge } from "../ui/Badge";

interface SongCardTagsProps {
  tags?: readonly string[];
  maxTags?: number;
  className?: string;
}

export function SongCardTags({ tags, maxTags = 3, className }: SongCardTagsProps) {
  const visibleTags = (tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, Math.max(0, maxTags));

  if (visibleTags.length === 0) return null;

  return (
    <div className={className ?? "mt-4 flex flex-wrap gap-2"}>
      {visibleTags.map((tag) => (
        <Badge key={tag} variant="neutral" className="max-w-full truncate px-2.5 py-1">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
