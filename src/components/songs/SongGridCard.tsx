import { ReleaseSongCard } from "./ReleaseSongCard";
import type { SongCardProps } from "./songCardTypes";

export function SongGridCard(props: SongCardProps) {
  return <ReleaseSongCard {...props} variant="grid" />;
}
