export function MediaReviewEmptyState({ hasFilters, onClearFilters }: { hasFilters?: boolean; onClearFilters?: () => void }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/18 p-8 text-center">
      <h2 className="text-xl font-semibold text-white">{hasFilters ? "No Matching Review Items" : "Review Queue Clear"}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/58">
        {hasFilters ? "Try clearing filters or changing the search query." : "Uploaded media assets that need assignment review will appear here."}
      </p>
      {hasFilters && onClearFilters ? (
        <button type="button" className="mt-4 min-h-10 rounded-md border border-white/12 px-4 text-sm font-semibold text-white" onClick={onClearFilters}>Clear Filters</button>
      ) : null}
    </div>
  );
}
