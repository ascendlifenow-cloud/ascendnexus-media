export function AuthenticationTransition({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return <span className="sr-only" role="status">Updating authentication state.</span>;
}
