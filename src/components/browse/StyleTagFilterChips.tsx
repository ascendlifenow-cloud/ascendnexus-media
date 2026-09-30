import { FilterChip } from "./FilterChip";

interface StyleTagFilterChipsProps {
  tags: string[];
  counts: Record<string, number>;
  selectedTag: string;
  onSelect: (tag: string) => void;
}

export function StyleTagFilterChips({ tags, counts, selectedTag, onSelect }: StyleTagFilterChipsProps) {
  return (
    <div className="rounded-anm-panel border border-white/10 bg-anm-surface-glass p-5 shadow-anm-card-glow backdrop-blur-xl">
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Style Tags</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <FilterChip
            key={tag}
            label={tag}
            count={counts[tag]}
            isActive={tag === selectedTag}
            onClick={() => onSelect(tag === selectedTag ? "" : tag)}
          />
        ))}
      </div>
    </div>
  );
}
