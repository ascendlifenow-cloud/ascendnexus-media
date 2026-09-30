import { ReleaseSongCard } from "./ReleaseSongCard";
import type { SongCardProps } from "./songCardTypes";

export function FeaturedReleaseCard(props: SongCardProps) {
  return <ReleaseSongCard {...props} variant="featured" maxTags={props.maxTags ?? 4} />;
}
