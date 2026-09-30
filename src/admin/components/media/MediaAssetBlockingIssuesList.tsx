export function MediaAssetBlockingIssuesList({ issues = [] }: { issues?: readonly string[] }) {
  if (!issues.length) return null;
  return (
    <div className="rounded-md border border-anm-pink/20 bg-anm-pink/10 p-3">
      <p className="text-sm font-semibold text-pink-100">Blocking Issues</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-white/70">
        {issues.map((issue) => <li key={issue}>{issue}</li>)}
      </ul>
    </div>
  );
}
