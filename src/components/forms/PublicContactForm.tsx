import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useContactAvailability, useSubmitContact } from "../../hooks/public/usePublicForms";
import { SectionContainer } from "../layout/SectionContainer";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { PublicConsentField } from "./PublicConsentField";
import { PublicFormUnavailable } from "./PublicFormUnavailable";

const emptyState = { name: "", email: "", subject: "", message: "", company: "", website: "", consent: false };

export function PublicContactForm() {
  const availability = useContactAvailability();
  const submit = useSubmitContact();
  const analytics = useAnalytics();
  const [state, setState] = useState(emptyState);
  const [error, setError] = useState<string | undefined>();
  const idempotencyToken = useMemo(() => `contact-${crypto.randomUUID?.() ?? Date.now()}`, []);
  const disabled = availability.isLoading || submit.isPending;
  const unavailable = availability.data && (!availability.data.enabled || !availability.data.operational);

  const update = (key: keyof typeof state, value: string | boolean) => {
    setState((current) => ({ ...current, [key]: value }));
    setError(undefined);
  };

  const validate = () => {
    if (state.name.trim().length < 2) return "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) return "Enter a valid email address.";
    if (state.message.trim().length < 10) return "Enter a message with at least 10 characters.";
    if (!state.consent) return "Consent is required before submitting.";
    return undefined;
  };

  return (
    <SectionContainer className="bg-ink py-12 sm:py-16" aria-labelledby="contact-form-heading">
      <Card className="border-white/12 bg-white/[0.055] p-6 sm:p-8">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Contact Form</p>
          <h2 id="contact-form-heading" className="mt-3 text-3xl font-semibold text-white">Send a message</h2>
          <p className="mt-3 text-sm leading-6 text-white/64">Messages are stored securely for admin review before any notification delivery is attempted.</p>
        </div>

        {unavailable ? <div className="mt-6"><PublicFormUnavailable title="Contact form unavailable" /></div> : null}

        {submit.isSuccess ? (
          <div className="mt-6 rounded-md border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-50" role="status">
            {submit.data.message} {submit.data.submissionReference ? `Reference: ${submit.data.submissionReference}` : null}
          </div>
        ) : null}

        <form
          className="mt-7 grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const validationError = validate();
            if (validationError) {
              setError(validationError);
              return;
            }
            void analytics.trackFormEvent("contact_form_submitted", { formLocation: "contact", formVariant: "contact_page" });
            submit.mutate({
              name: state.name,
              email: state.email,
              subject: state.subject,
              message: state.message,
              company: state.company,
              website: state.website,
              consent: { consentProvided: state.consent, consentVersion: "public-forms-v1" },
              idempotencyToken,
              sourceContext: { page: "contact" },
            }, {
              onSuccess: () => {
                void analytics.trackFormEvent("contact_form_accepted", { formLocation: "contact", formVariant: "contact_page", result: "accepted" });
              },
              onError: () => {
                void analytics.trackFormEvent("contact_form_error", { formLocation: "contact", errorCategory: "submission_failed" });
              },
            });
          }}
          noValidate
        >
          {error || submit.isError ? (
            <div className="rounded-md border border-red-300/30 bg-red-500/10 p-4 text-sm font-semibold text-red-100" role="alert">
              {error ?? (submit.error instanceof Error ? submit.error.message : "Submission failed.")}
            </div>
          ) : null}
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Name" id="contact-name" required value={state.name} onChange={(value) => update("name", value)} autoComplete="name" />
            <Field label="Email" id="contact-email" required type="email" value={state.email} onChange={(value) => update("email", value)} autoComplete="email" />
          </div>
          <Field label="Subject" id="contact-subject" value={state.subject} onChange={(value) => update("subject", value)} />
          <div>
            <label htmlFor="contact-message" className="text-sm font-semibold text-white">Message <span className="text-cyanGlow">*</span></label>
            <textarea
              id="contact-message"
              required
              minLength={10}
              maxLength={5000}
              value={state.message}
              onChange={(event) => update("message", event.target.value)}
              aria-describedby="contact-message-count"
              className="mt-2 min-h-40 w-full rounded-md border border-white/12 bg-black/24 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyanGlow"
            />
            <p id="contact-message-count" className="mt-2 text-xs text-white/46">{state.message.length}/5000 characters</p>
          </div>
          <div className="hidden" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" tabIndex={-1} autoComplete="off" value={state.website} onChange={(event) => update("website", event.target.value)} />
          </div>
          <PublicConsentField id="contact-consent" checked={state.consent} onChange={(checked) => update("consent", checked)} />
          <Button type="submit" size="lg" disabled={disabled || Boolean(unavailable)}>
            <Send className="h-4 w-4" aria-hidden="true" />
            {submit.isPending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </Card>
    </SectionContainer>
  );
}

function Field({ label, id, value, onChange, type = "text", required = false, autoComplete }: { label: string; id: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; autoComplete?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-white">{label} {required ? <span className="text-cyanGlow">*</span> : null}</label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-md border border-white/12 bg-black/24 px-4 text-sm text-white outline-none transition focus:border-cyanGlow"
      />
    </div>
  );
}
