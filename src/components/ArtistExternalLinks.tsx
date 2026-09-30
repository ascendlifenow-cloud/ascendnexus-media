import type { ArtistExternalLinks as ArtistExternalLinksModel } from "../models/artist";
import { ExternalLinksPanel } from "./links";

interface ArtistExternalLinksProps {
  links?: ArtistExternalLinksModel;
  artistName?: string;
}

export function ArtistExternalLinks({ links, artistName = "this artist" }: ArtistExternalLinksProps) {
  return (
    <ExternalLinksPanel
      links={links}
      title="Artist channels"
      contextLabel={artistName}
      emptyMessage="Streaming, social, and artist channel links are ready to appear here when public destinations are configured."
    />
  );
}
