import type { PublicSongRelease } from "../models/release";
import { AudioPreviewPlayer } from "./AudioPreviewPlayer";

interface SongAudioPreviewProps {
  song: PublicSongRelease;
  artistName: string;
}

export function SongAudioPreview({ song, artistName }: SongAudioPreviewProps) {
  return (
    <section id="audio-preview" className="bg-night py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-white/10 bg-white/[0.055] p-6 shadow-xl shadow-black/20">
          <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Audio Preview</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{song.title}</h2>
          </div>
          <AudioPreviewPlayer
            releaseId={song.releaseId}
            title={song.title}
            artistName={artistName}
            audioPreviewUrl={song.audioPreviewUrl}
            analyticsSong={song}
          />
        </div>
      </div>
    </section>
  );
}
