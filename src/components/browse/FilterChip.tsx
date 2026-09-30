import { cx } from "../../utils/format";

interface FilterChipProps {
  label: string;
  count?: number;
  isActive?: boolean;
  onClick: () => void;
}

export function FilterChip({ label, count, isActive = false, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cx(
        "anm-focus inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition duration-300 ease-anm-out",
        isActive
          ? "border-anm-gold/45 bg-anm-sunrise text-anm-bg shadow-anm-sunrise-glow"
          : "border-white/12 bg-white/[0.065] text-white/76 hover:border-anm-pink/45 hover:bg-white/12 hover:text-white",
      )}
    >
      <span>{label}</span>
      {typeof count === "number" ? <span className={isActive ? "text-anm-bg/70" : "text-white/42"}>{count}</span> : null}
    </button>
  );
}
