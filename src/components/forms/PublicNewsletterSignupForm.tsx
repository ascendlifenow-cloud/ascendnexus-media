import { useMemo, useState } from "react";
import { MailPlus } from "lucide-react";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useNewsletterAvailability, useSubscribeNewsletter } from "../../hooks/public/usePublicForms";
import { SectionContainer } from "../layout/SectionContainer";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { PublicConsentField } from "./PublicConsentField";
import { PublicFormUnavailable } from "./PublicFormUnavailable";

export function PublicNewsletterSignupForm() {
  const availability = useNewsletterAvailability();
  const subscribe = useSubscribeNewsletter();
  const analytics = useAnalytics();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | undefined>();
  const idempotencyToken = useMemo(() => `newsletter-${crypto.randomUUID?.() ?? Date.now()}`, []);
  const unavailable = availability.data && (!availability.data.enabled || !availability.data.operational);

  return (
    <SectionContainer className="bg-ink py-12 sm:py-16" aria-labelledby="newsletter-heading">
      <Card className="border-white/12 bg-white/[0.045] p-6 sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_minmax(320px,420px)] lg:items-start">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-md border border-white/14 bg-black/22">
              <MailPlus className="h-6 w-6 text-cyanGlow" aria-hidden="true" />
            </div>
            <h2 id="newsletter-heading" className="mt-5 text-3xl font-semibold text-white">
              Join the Ascend Nexus Media updates list.
            </h2>
            <p className="mt-3 text-base leading-7 text-white/66">
              Subscribe for public release updates. Confirmation is required before the address is added.
            </p>
          </div>

          {unavailable ? (
            <PublicFormUnavailable title="Newsletter unavailable" />
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                  setError("Enter a valid email address.");
                  return;
                }
                if (!consent) {
                  setError("Consent is required before subscribing.");
                  return;
                }
                setError(undefined);
                void analytics.trackFormEvent("newsletter_signup_submitted", { formLocation: "contact", formVariant: "contact_page" });
                subscribe.mutate({
                  email,
                  displayName,
                  website,
                  consent: { consentProvided: consent, consentVersion: "public-forms-v1" },
                  idempotencyToken,
                  sourceContext: { page: "contact", variant: "contact_page" },
                }, {
                  onSuccess: () => {
                    void analytics.trackFormEvent("newsletter_signup_accepted", { formLocation: "contact", formVariant: "contact_page", result: "accepted" });
                  },
                });
              }}
              noValidate
            >
              {error || subscribe.isError ? (
                <div className="rounded-md border border-red-300/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100" role="alert">
                  {error ?? (subscribe.error instanceof Error ? subscribe.error.message : "Subscription failed.")}
                </div>
              ) : null}
              {subscribe.isSuccess ? (
                <div className="rounded-md border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm leading-6 text-emerald-50" role="status">
                  {subscribe.data.message}
                </div>
              ) : null}
              <label htmlFor="newsletter-name" className="sr-only">Name</label>
              <input
                id="newsletter-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Name optional"
                autoComplete="name"
                className="min-h-11 rounded-md border border-white/12 bg-black/24 px-4 text-sm text-white outline-none transition placeholder:text-white/36 focus:border-cyanGlow"
              />
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className="min-h-11 rounded-md border border-white/12 bg-black/24 px-4 text-sm text-white outline-none transition placeholder:text-white/36 focus:border-cyanGlow"
              />
              <div className="hidden" aria-hidden="true">
                <label htmlFor="newsletter-website">Website</label>
                <input id="newsletter-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
              </div>
              <PublicConsentField id="newsletter-consent" checked={consent} onChange={setConsent} />
              <Button type="submit" disabled={subscribe.isPending || availability.isLoading}>
                {subscribe.isPending ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
          )}
        </div>
      </Card>
    </SectionContainer>
  );
}
