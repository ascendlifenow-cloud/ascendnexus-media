import { AudioLines } from "lucide-react";

interface ArtistStyleIdentityProps {
  genres: string[];
  styleTags: string[];
  musicStyle: string;
}

export function ArtistStyleIdentity({ genres, styleTags, musicStyle }: ArtistStyleIdentityProps) {
  const hasDerivedStyles = genres.length > 0 || styleTags.length > 0;

  return (
    <section className="bg-night py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Style Identity</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Sound palette and genre signals</h2>
            <p className="mt-4 text-base leading-7 text-white/64">{musicStyle}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-6">
            <AudioLines className="h-8 w-8 text-cyanGlow" aria-hidden="true" />
            {hasDerivedStyles ? (
              <div className="mt-5 space-y-6">
                {genres.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/48">Genres</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {genres.map((genre) => (
                        <span key={genre} className="rounded-md bg-cyanGlow px-3 py-1.5 text-sm font-semibold text-ink">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {styleTags.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/48">Style Tags</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {styleTags.map((tag) => (
                        <span key={tag} className="rounded-md border border-white/12 bg-white/8 px-3 py-1.5 text-sm text-white/76">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 text-white/64">Style metadata will appear here as published releases are added.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
