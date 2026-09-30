import { ReleaseSongCard } from "./ReleaseSongCard";
import type { SongCardProps } from "./songCardTypes";

export function SongCompactCard(props: SongCardProps) {
  return <ReleaseSongCard {...props} variant="compact" />;
}
