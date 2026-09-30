import { Badge } from "./ui/Badge";

interface SongStyleTagsProps {
  genre?: string;
  styleTags: string[];
}

export function SongStyleTags({ genre, styleTags }: SongStyleTagsProps) {
  if (!genre && styleTags.length === 0) {
    return <p className="text-sm text-white/58">Style details coming soon.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {genre ? <Badge variant="sunrise" className="text-sm">{genre}</Badge> : null}
      {styleTags.map((tag) => (
        <Badge key={tag} variant="neutral" className="text-sm">{tag}</Badge>
      ))}
    </div>
  );
}
