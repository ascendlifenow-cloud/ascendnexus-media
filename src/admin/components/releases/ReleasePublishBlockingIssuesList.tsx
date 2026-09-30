interface ReleasePublishBlockingIssuesListProps {
  issues: readonly string[];
}

export function ReleasePublishBlockingIssuesList({ issues }: ReleasePublishBlockingIssuesListProps) {
  if (!issues.length) return null;
  return (
    <div className="rounded-md border border-anm-pink/25 bg-anm-pink/8 p-3">
      <p className="text-sm font-semibold text-white">Blocking Issues</p>
      <ul className="mt-2 space-y-1 text-sm leading-5 text-white/64">
        {issues.map((issue, index) => <li key={`${issue}-${index}`}>{issue}</li>)}
      </ul>
    </div>
  );
}
