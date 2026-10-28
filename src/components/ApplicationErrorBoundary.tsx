import { Component, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

export const isDeploymentChunkError = (error: Error) => /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .+ failed/i.test(error.message);

export class ApplicationErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  render() {
    if (!this.state.error) return this.props.children;
    const updated = isDeploymentChunkError(this.state.error);
    return <main className="flex min-h-screen items-center justify-center bg-night px-6 text-white">
      <section role="alert" className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold">{updated ? "A site update is available" : "Unable to display this page"}</h1>
        <p className="mt-3 text-white/75">{updated ? "Reload this page to load the current version. Your sign-in will be checked again securely." : "Please reload the page and try again."}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/30 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyanGlow">
          <RefreshCw className="h-4 w-4" aria-hidden /> Reload page
        </button>
      </section>
    </main>;
  }
}
