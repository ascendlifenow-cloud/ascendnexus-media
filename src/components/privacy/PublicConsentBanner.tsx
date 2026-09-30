import { useEffect, useState } from "react";
import { useAnalyticsConsent } from "../../hooks/public/useAnalyticsConsent";
import { analyticsService } from "../../services/analytics";
import { Button } from "../ui/Button";
import { PublicConsentPreferenceCenter } from "./PublicConsentPreferenceCenter";

export function PublicConsentBanner() {
  const { policy, needsPrompt, loading, saving, acceptAll, rejectOptional } = useAnalyticsConsent();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (needsPrompt) {
      void analyticsService.trackConsentEvent("consent_banner_viewed", { policyVersion: policy?.version ?? "unknown" });
    }
  }, [needsPrompt, policy?.version]);

  if (loading || !needsPrompt) return <PublicConsentPreferenceCenter open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/14 bg-ink/96 px-4 py-4 text-white shadow-2xl backdrop-blur" role="region" aria-label="Privacy choices">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold">{policy?.title ?? "Privacy choices"}</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/66">{policy?.summary ?? "Choose optional analytics and site preferences."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void acceptAll()} disabled={saving}>Accept All</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => void rejectOptional()} disabled={saving}>Reject Optional</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPreferencesOpen(true)}>Preferences</Button>
          </div>
        </div>
      </div>
      <PublicConsentPreferenceCenter open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
    </>
  );
}
