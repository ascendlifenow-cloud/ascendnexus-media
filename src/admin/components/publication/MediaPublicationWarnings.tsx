export function MediaPublicationWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="grid gap-2 rounded-md border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">
      {warnings.map((warning) => <p key={warning}>{warning}</p>)}
    </div>
  );
}
