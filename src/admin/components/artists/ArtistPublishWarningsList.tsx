interface ArtistPublishWarningsListProps {
  warnings: readonly string[];
}

export function ArtistPublishWarningsList({ warnings }: ArtistPublishWarningsListProps) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-md border border-white/10 bg-black/18 p-3">
      <p className="text-sm font-semibold text-white">Warnings</p>
      <ul className="mt-2 space-y-1 text-sm leading-5 text-white/58">
        {warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
      </ul>
    </div>
  );
}
