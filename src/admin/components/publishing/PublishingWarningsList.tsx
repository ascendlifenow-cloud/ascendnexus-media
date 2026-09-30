export function PublishingWarningsList({ warnings }: { warnings: readonly string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-md border border-anm-warning/30 bg-anm-warning/10 p-3">
      <h3 className="text-sm font-semibold text-white">Warnings</h3>
      <ul className="mt-2 grid gap-1 text-sm text-white/70">
        {warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
      </ul>
    </div>
  );
}
