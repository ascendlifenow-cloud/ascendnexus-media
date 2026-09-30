import type { GalleryFilter } from "../../models/gallery";
import { cx } from "../../utils/format";

interface GalleryFilterBarProps {
  filters: Array<{ label: string; value: GalleryFilter }>;
  activeFilter: GalleryFilter;
  counts: Record<GalleryFilter, number>;
  onChange: (filter: GalleryFilter) => void;
}

export function GalleryFilterBar({ filters, activeFilter, counts, onChange }: GalleryFilterBarProps) {
  return (
    <div className="rounded-anm-panel border border-white/10 bg-anm-surface-glass p-5 shadow-anm-card-glow backdrop-blur-xl">
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Gallery Filters</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(filter.value)}
              className={cx(
                "anm-focus inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition duration-300 ease-anm-out",
                isActive
                  ? "border-anm-gold/45 bg-anm-sunrise text-anm-bg shadow-anm-sunrise-glow"
                  : "border-white/12 bg-white/[0.065] text-white/76 hover:border-anm-pink/45 hover:bg-white/12 hover:text-white",
              )}
            >
              <span>{filter.label}</span>
              <span className={isActive ? "text-anm-bg/70" : "text-white/42"}>{counts[filter.value] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
