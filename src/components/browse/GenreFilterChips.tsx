import { FilterChip } from "./FilterChip";

interface GenreFilterChipsProps {
  genres: string[];
  counts: Record<string, number>;
  selectedGenre: string;
  onSelect: (genre: string) => void;
}

export function GenreFilterChips({ genres, counts, selectedGenre, onSelect }: GenreFilterChipsProps) {
  return (
    <div className="rounded-anm-panel border border-white/10 bg-anm-surface-glass p-5 shadow-anm-card-glow backdrop-blur-xl">
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Genres</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {genres.map((genre) => (
          <FilterChip
            key={genre}
            label={genre}
            count={counts[genre]}
            isActive={genre === selectedGenre}
            onClick={() => onSelect(genre === selectedGenre ? "" : genre)}
          />
        ))}
      </div>
    </div>
  );
}
