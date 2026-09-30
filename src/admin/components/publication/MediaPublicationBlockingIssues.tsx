export function MediaPublicationBlockingIssues({ issues }: { issues: string[] }) {
  if (!issues.length) return null;
  return (
    <div className="grid gap-2 rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
      {issues.map((issue) => <p key={issue}>{issue}</p>)}
    </div>
  );
}
