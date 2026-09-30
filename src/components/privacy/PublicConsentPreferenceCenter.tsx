import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useAnalyticsConsent } from "../../hooks/public/useAnalyticsConsent";
import type { ConsentCategory } from "../../services/public/publicConsentTypes";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface PublicConsentPreferenceCenterProps {
  open: boolean;
  onClose: () => void;
}

const categoryOrder: ConsentCategory[] = ["necessary", "analytics", "functional", "marketing"];

export function PublicConsentPreferenceCenter({ open, onClose }: PublicConsentPreferenceCenterProps) {
  const { policy, choices, saveChoices, withdraw, saving, error, gpcActive } = useAnalyticsConsent();
  const [draft, setDraft] = useState(choices);

  useEffect(() => {
    if (open) setDraft(choices);
  }, [choices, open]);

  const categories = useMemo(() => categoryOrder.map((category) => policy?.categories.find((item) => item.category === category)).filter(Boolean), [policy?.categories]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="privacy-preferences-heading">
      <Card className="max-h-[88vh] w-full max-w-2xl overflow-y-auto border-white/14 bg-ink p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="privacy-preferences-heading" className="text-2xl font-semibold">Privacy choices</h2>
            <p className="mt-2 text-sm leading-6 text-white/64">{policy?.summary ?? "Manage optional site storage and analytics."}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-white/12 p-2 text-white/76 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-cyanGlow" aria-label="Close privacy preferences">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {gpcActive ? (
          <div className="mt-4 rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm leading-6 text-cyanGlow" role="status">
            A browser-level privacy preference is active. Analytics and marketing remain off while it is present.
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          {categories.map((definition) => definition ? (
            <label key={definition.category} className="flex gap-3 rounded-md border border-white/12 bg-white/[0.04] p-4">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-cyanGlow"
                checked={draft[definition.category]}
                disabled={definition.required || (gpcActive && (definition.category === "analytics" || definition.category === "marketing"))}
                onChange={(event) => setDraft((current) => ({ ...current, [definition.category]: event.target.checked, necessary: true }))}
                aria-describedby={`privacy-${definition.category}-description`}
              />
              <span>
                <span className="block text-sm font-semibold">{definition.title} {definition.required ? <span className="text-white/46">(required)</span> : null}</span>
                <span id={`privacy-${definition.category}-description`} className="mt-1 block text-sm leading-6 text-white/62">{definition.description}</span>
              </span>
            </label>
          ) : null)}
        </div>

        {error ? <div className="mt-4 rounded-md border border-red-300/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100" role="alert">{error}</div> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void saveChoices(draft, "preference_center").then(onClose)} disabled={saving}>Save Preferences</Button>
          <Button type="button" variant="secondary" onClick={() => void withdraw().then(onClose)} disabled={saving}>Withdraw Optional</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}
