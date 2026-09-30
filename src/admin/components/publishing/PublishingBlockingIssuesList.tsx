export function PublishingBlockingIssuesList({ issues }: { issues: readonly string[] }) {
  if (!issues.length) return null;
  return (
    <div className="rounded-md border border-anm-error/30 bg-anm-error/10 p-3">
      <h3 className="text-sm font-semibold text-white">Blocking Issues</h3>
      <ul className="mt-2 grid gap-1 text-sm text-white/70">
        {issues.map((issue, index) => <li key={`${issue}-${index}`}>{issue}</li>)}
      </ul>
    </div>
  );
}
