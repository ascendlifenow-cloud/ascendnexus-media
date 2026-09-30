import { AlertTriangle } from "lucide-react";
import type { AdminMetadataFormValidation } from "../../../utils/adminMetadataFormUtils";
import { FormSection } from "./AdminMetadataFormControls";

export function AdminMetadataValidationSummary({ validation, submitError }: { validation: AdminMetadataFormValidation; submitError: string | null }) {
  const errors = Object.values(validation.errors);
  return (
    <FormSection title="Validation & Readiness" description={`Readiness state: ${validation.readiness.replace(/_/g, " ")}`}>
      {submitError ? <p className="text-sm font-semibold text-anm-error">{submitError}</p> : null}
      {errors.length || validation.warnings.length ? (
        <div className="grid gap-2">
          {[...errors, ...validation.warnings].map((message) => (
            <p key={message} className="flex gap-2 rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-white/76">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-anm-warning" aria-hidden />
              {message}
            </p>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-anm-success/30 bg-anm-success/10 px-3 py-2 text-sm text-anm-success">
          Metadata looks complete.
        </p>
      )}
    </FormSection>
  );
}
