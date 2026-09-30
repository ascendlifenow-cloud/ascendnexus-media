import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { analyticsService } from "../services/analytics";
import { consentStorageService } from "../services/analytics/ConsentStorageService";
import { globalPrivacyControlService } from "../services/analytics/GlobalPrivacyControlService";
import { publicConsentApiService } from "../services/public/PublicConsentApiService";
import type { ConsentCategory, PublicConsentAvailability, PublicConsentPolicy, PublicConsentRecord } from "../services/public/publicConsentTypes";

interface PublicConsentContextValue {
  policy?: PublicConsentPolicy;
  availability?: PublicConsentAvailability;
  consent?: PublicConsentRecord;
  loading: boolean;
  saving: boolean;
  error?: string;
  needsPrompt: boolean;
  gpcActive: boolean;
  choices: Record<ConsentCategory, boolean>;
  saveChoices: (choices: Record<ConsentCategory, boolean>, source?: "banner" | "preference_center") => Promise<void>;
  acceptAll: () => Promise<void>;
  rejectOptional: () => Promise<void>;
  withdraw: () => Promise<void>;
  hasConsent: (category: ConsentCategory) => boolean;
}

const defaultChoices: Record<ConsentCategory, boolean> = { necessary: true, analytics: false, functional: false, marketing: false };

export const PublicConsentContext = createContext<PublicConsentContextValue>({
  loading: true,
  saving: false,
  needsPrompt: false,
  gpcActive: false,
  choices: defaultChoices,
  saveChoices: async () => undefined,
  acceptAll: async () => undefined,
  rejectOptional: async () => undefined,
  withdraw: async () => undefined,
  hasConsent: (category) => category === "necessary",
});

export function PublicConsentProvider({ children }: { children: ReactNode }) {
  const [policy, setPolicy] = useState<PublicConsentPolicy | undefined>();
  const [availability, setAvailability] = useState<PublicConsentAvailability | undefined>();
  const [consent, setConsent] = useState<PublicConsentRecord | undefined>(() => consentStorageService.getStoredConsent());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const gpcActive = globalPrivacyControlService.isGpcEnabled() || globalPrivacyControlService.isDntEnabled();

  useEffect(() => {
    let mounted = true;
    Promise.all([publicConsentApiService.getPolicy(), publicConsentApiService.getAvailability()])
      .then(([nextPolicy, nextAvailability]) => {
        if (!mounted) return;
        setPolicy(nextPolicy);
        setAvailability(nextAvailability);
      })
      .catch((nextError) => {
        if (mounted) setError(nextError instanceof Error ? nextError.message : "Consent policy unavailable.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    analyticsService.setConsent(consent);
  }, [consent]);

  const choices = consent?.status === "active" ? consent.choices : defaultChoices;
  const needsPrompt = Boolean(!loading && availability?.consentRequired !== false && (!consent || consent.status !== "active" || consent.policyVersion !== policy?.version));

  const saveChoices = useCallback(async (nextChoices: Record<ConsentCategory, boolean>, source: "banner" | "preference_center" = "preference_center") => {
    setSaving(true);
    setError(undefined);
    try {
      const choicesToSave = { ...nextChoices, necessary: true };
      if (gpcActive) {
        choicesToSave.analytics = false;
        choicesToSave.marketing = false;
      }
      const record = await publicConsentApiService.saveConsent(choicesToSave, source);
      consentStorageService.saveConsent(record);
      setConsent(record);
      void analyticsService.trackConsentEvent(source === "banner" ? (record.choices.analytics || record.choices.functional || record.choices.marketing ? "consent_accepted_all" : "consent_rejected_optional") : "consent_preferences_saved", {
        policyVersion: record.policyVersion,
        choiceCategories: Object.entries(record.choices).filter(([, enabled]) => enabled).map(([category]) => category),
        gpcApplied: record.gpcApplied,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Consent preferences could not be saved.");
    } finally {
      setSaving(false);
    }
  }, [gpcActive]);

  const acceptAll = useCallback(() => saveChoices({ necessary: true, analytics: true, functional: true, marketing: !gpcActive }, "banner"), [gpcActive, saveChoices]);
  const rejectOptional = useCallback(() => saveChoices(defaultChoices, "banner"), [saveChoices]);

  const withdraw = useCallback(async () => {
    setSaving(true);
    try {
      const record = await publicConsentApiService.withdrawConsent(consent?.consentReference);
      consentStorageService.saveConsent(record);
      analyticsService.reset();
      setConsent(record);
    } finally {
      setSaving(false);
    }
  }, [consent?.consentReference]);

  const value = useMemo<PublicConsentContextValue>(() => ({
    policy,
    availability,
    consent,
    loading,
    saving,
    error,
    needsPrompt,
    gpcActive,
    choices,
    saveChoices,
    acceptAll,
    rejectOptional,
    withdraw,
    hasConsent: (category) => category === "necessary" || (consent?.status === "active" && consent.choices[category] === true),
  }), [acceptAll, availability, choices, consent, error, gpcActive, loading, needsPrompt, policy, rejectOptional, saveChoices, saving, withdraw]);

  return <PublicConsentContext.Provider value={value}>{children}</PublicConsentContext.Provider>;
}
