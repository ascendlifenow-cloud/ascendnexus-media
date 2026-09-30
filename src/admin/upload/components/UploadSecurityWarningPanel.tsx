import type { UploadSecurityCheck } from "../../../models/security";

interface UploadSecurityWarningPanelProps {
  errors?: string[];
  warnings?: string[];
  securityChecks?: UploadSecurityCheck[];
}

const securityCodePattern = /(security|filename|extension|mime|path|target|unsafe|scan|virus|sanitize)/i;

const uniqueMessages = (messages: string[]): string[] => [...new Set(messages.filter(Boolean))];

export function UploadSecurityWarningPanel({
  errors = [],
  warnings = [],
  securityChecks = [],
}: UploadSecurityWarningPanelProps) {
  const securityErrors = uniqueMessages([
    ...errors.filter((message) => securityCodePattern.test(message)),
    ...securityChecks
      .filter((check) => check.status === "failed" || check.severity === "blocking")
      .map((check) => check.message),
  ]);
  const securityWarnings = uniqueMessages([
    ...warnings.filter((message) => securityCodePattern.test(message)),
    ...securityChecks
      .filter((check) => check.status === "warning")
      .map((check) => check.message),
  ]);

  if (!securityErrors.length && !securityWarnings.length) return null;

  return (
    <section className="rounded-md border border-anm-gold/30 bg-anm-gold/10 p-3 text-sm text-white/80" aria-label="Upload security warnings">
      <div className="mb-2 font-semibold text-anm-gold">Upload Security</div>
      {securityErrors.length ? (
        <ul className="list-disc space-y-1 pl-5 text-anm-pink">
          {securityErrors.map((message) => <li key={message}>{message}</li>)}
        </ul>
      ) : null}
      {securityWarnings.length ? (
        <ul className="list-disc space-y-1 pl-5 text-anm-gold">
          {securityWarnings.map((message) => <li key={message}>{message}</li>)}
        </ul>
      ) : null}
    </section>
  );
}
