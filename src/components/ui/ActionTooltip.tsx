export function ActionTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-[80] mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover/action:opacity-100 group-focus-within/action:opacity-100"
    >
      {label}
    </span>
  );
}
