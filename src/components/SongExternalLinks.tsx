import type { ReleaseExternalLinks } from "../models/release";
import { ExternalLinksPanel } from "./links";

interface SongExternalLinksProps {
  links?: ReleaseExternalLinks;
  songTitle?: string;
}

export function SongExternalLinks({ links, songTitle = "this song" }: SongExternalLinksProps) {
  return (
    <ExternalLinksPanel
      links={links}
      title="Listen on other platforms"
      contextLabel={songTitle}
      emptyMessage="Streaming and platform links will appear here when available."
    />
  );
}
