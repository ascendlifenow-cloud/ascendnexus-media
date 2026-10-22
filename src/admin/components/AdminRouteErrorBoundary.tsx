import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";

interface AdminRouteErrorBoundaryProps {
  children: ReactNode;
  routeKey: string;
}

interface AdminRouteErrorBoundaryState {
  error: Error | null;
}

export class AdminRouteErrorBoundary extends Component<AdminRouteErrorBoundaryProps, AdminRouteErrorBoundaryState> {
  state: AdminRouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AdminRouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Admin route render failed", { route: this.props.routeKey, error, componentStack: info.componentStack });
  }

  componentDidUpdate(previousProps: AdminRouteErrorBoundaryProps) {
    if (previousProps.routeKey !== this.props.routeKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-anm-bg px-4 text-white">
        <section className="w-full max-w-lg rounded-md border border-amber-300/20 bg-anm-surface-glass p-6 text-center shadow-anm-card-glow">
          <AlertTriangle className="mx-auto h-9 w-9 text-amber-300" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold">Admin page could not finish loading</h1>
          <p className="mt-3 text-sm leading-6 text-white/62">Your session is still intact. Retry this page, or return to the dashboard.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => this.setState({ error: null })}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Retry page
            </Button>
            <Button type="button" variant="glass" onClick={() => window.location.assign("/admin/dashboard")}>Dashboard</Button>
          </div>
        </section>
      </main>
    );
  }
}
