export function MediaVersionCompareSummary({ comparison }: { comparison?: Record<string, string | number | boolean | null> | null }) {
  if (!comparison) return null;
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.045] p-3 text-sm text-white/62">
      <p className="font-semibold text-white">Version Comparison</p>
      <dl className="mt-2 grid gap-1">
        {Object.entries(comparison).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3">
            <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="text-right text-white/78">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
