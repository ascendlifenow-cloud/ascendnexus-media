export function MediaAssetVisibilityWarningsList({ warnings = [] }: { warnings?: readonly string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-md border border-anm-gold/20 bg-anm-gold/10 p-3">
      <p className="text-sm font-semibold text-anm-gold">Visibility Warnings</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-white/70">
        {warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
    </div>
  );
}
