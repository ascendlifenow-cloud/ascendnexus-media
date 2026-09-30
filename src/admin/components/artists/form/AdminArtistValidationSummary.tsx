import { AlertTriangle } from "lucide-react";
import type { AdminArtistFormValidation } from "../../../utils/adminArtistFormUtils";
import { Badge } from "../../../../components/ui/Badge";

interface AdminArtistValidationSummaryProps {
  validation: AdminArtistFormValidation;
  submitError?: string | null;
}

export function AdminArtistValidationSummary({ validation, submitError }: AdminArtistValidationSummaryProps) {
  const errors = Object.values(validation.errors);
  if (!errors.length && !submitError && !validation.missingFields.length) return null;

  return (
    <section className="rounded-anm-panel border border-anm-gold/20 bg-anm-sunrise/10 p-4" aria-label="Artist form validation">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <AlertTriangle className="h-4 w-4 text-anm-gold" aria-hidden />
        Form Readiness
      </div>
      {submitError ? <p className="mt-2 text-sm text-anm-error">{submitError}</p> : null}
      {errors.length ? (
        <ul className="mt-2 grid gap-1 text-sm text-white/72">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      ) : null}
      {validation.missingFields.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {validation.missingFields.map((field) => (
            <Badge key={field} variant="neutral" className="px-2 py-1 text-[0.68rem]">Missing {field}</Badge>
          ))}
        </div>
      ) : null}
    </section>
  );
}
