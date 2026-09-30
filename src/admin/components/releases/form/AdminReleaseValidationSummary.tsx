import { AlertTriangle } from "lucide-react";
import type { AdminReleaseFormValidation } from "../../../utils/adminReleaseFormUtils";
import { Card } from "../../../../components/ui/Card";

interface AdminReleaseValidationSummaryProps {
  validation: AdminReleaseFormValidation;
  submitError: string | null;
}

export function AdminReleaseValidationSummary({ validation, submitError }: AdminReleaseValidationSummaryProps) {
  const errors = Object.values(validation.errors);
  if (!submitError && !errors.length && !validation.missingFields.length) return null;

  return (
    <Card className="border-anm-warning/30 bg-anm-warning/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-anm-warning" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-white">Release readiness</h2>
          {submitError ? <p className="mt-1 text-sm text-anm-warning">{submitError}</p> : null}
          {errors.length ? (
            <ul className="mt-2 grid gap-1 text-sm text-white/70">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          ) : null}
          {validation.missingFields.length ? (
            <p className="mt-2 text-sm text-white/58">Missing or recommended: {validation.missingFields.join(", ")}.</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
