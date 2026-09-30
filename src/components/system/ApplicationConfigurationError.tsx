import { RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";

interface ApplicationConfigurationErrorProps {
  code?: string;
  message?: string;
  supportContact?: string;
  onRetry?: () => void;
}

export function ApplicationConfigurationError({
  code = "APP_CONFIG_INVALID",
  message = "The application is not configured correctly.",
  supportContact,
  onRetry,
}: ApplicationConfigurationErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-white">
      <section className="w-full max-w-lg rounded-md border border-white/10 bg-white/[0.045] p-6 shadow-anm-card-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-anm-pink">{code}</p>
        <h1 className="mt-3 text-2xl font-semibold">Configuration Error</h1>
        <p className="mt-3 text-sm leading-6 text-white/68">{message}</p>
        {supportContact ? <p className="mt-3 text-sm text-white/58">Contact support: {supportContact}</p> : null}
        {onRetry ? (
          <div className="mt-5">
            <Button type="button" variant="glass" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Retry
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
