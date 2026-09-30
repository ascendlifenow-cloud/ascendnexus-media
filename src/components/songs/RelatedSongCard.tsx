import { ReleaseSongCard } from "./ReleaseSongCard";
import type { SongCardProps } from "./songCardTypes";

export function RelatedSongCard(props: SongCardProps) {
  return <ReleaseSongCard {...props} variant="related" showAudioPreview={props.showAudioPreview ?? false} />;
}
