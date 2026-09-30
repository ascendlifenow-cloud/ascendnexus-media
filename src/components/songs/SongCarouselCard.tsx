import { ReleaseSongCard } from "./ReleaseSongCard";
import type { SongCardProps } from "./songCardTypes";

export function SongCarouselCard(props: SongCardProps) {
  return <ReleaseSongCard {...props} variant="carousel" />;
}
