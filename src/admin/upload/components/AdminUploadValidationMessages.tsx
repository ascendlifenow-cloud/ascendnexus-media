import type { MediaValidationMessage } from "../../../models/media";
import { UploadSecurityWarningPanel } from "./UploadSecurityWarningPanel";

interface AdminUploadValidationMessagesProps {
  errors?: string[];
  warnings?: string[];
  messages?: MediaValidationMessage[];
}

export function AdminUploadValidationMessages({ errors = [], warnings = [], messages = [] }: AdminUploadValidationMessagesProps) {
  const errorMessages = [...errors, ...messages.filter((message) => message.severity === "error").map((message) => message.message)];
  const warningMessages = [...warnings, ...messages.filter((message) => message.severity === "warning").map((message) => message.message)];
  const infoMessages = messages.filter((message) => message.severity === "info").map((message) => message.message);
  const securityMessages = messages.filter((message) => message.code.startsWith("security_"));

  if (!errorMessages.length && !warningMessages.length && !infoMessages.length) return null;

  return (
    <div className="grid gap-2 text-sm" aria-live="polite">
      <UploadSecurityWarningPanel
        errors={securityMessages.filter((message) => message.severity === "error").map((message) => message.message)}
        warnings={securityMessages.filter((message) => message.severity === "warning").map((message) => message.message)}
      />
      {errorMessages.length ? (
        <ul className="list-disc space-y-1 pl-5 text-anm-pink">
          {[...new Set(errorMessages)].map((error) => <li key={error}>Error: {error}</li>)}
        </ul>
      ) : null}
      {warningMessages.length ? (
        <ul className="list-disc space-y-1 pl-5 text-anm-gold">
          {[...new Set(warningMessages)].map((warning) => <li key={warning}>Warning: {warning}</li>)}
        </ul>
      ) : null}
      {infoMessages.length ? (
        <ul className="list-disc space-y-1 pl-5 text-white/50">
          {[...new Set(infoMessages)].map((info) => <li key={info}>Info: {info}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
