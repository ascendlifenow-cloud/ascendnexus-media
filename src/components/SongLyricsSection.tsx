interface SongLyricsSectionProps {
  lyrics?: string;
}

export function SongLyricsSection({ lyrics }: SongLyricsSectionProps) {
  return (
    <section className="bg-night py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-white/10 bg-white/[0.055] p-6">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Lyrics</p>
          {lyrics ? (
            <div className="mt-5 whitespace-pre-line text-base leading-8 text-white/74">{lyrics}</div>
          ) : (
            <p className="mt-5 text-base leading-7 text-white/64">Lyrics and song notes will be added soon.</p>
          )}
        </div>
      </div>
    </section>
  );
}
