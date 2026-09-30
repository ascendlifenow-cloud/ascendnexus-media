import type { PublicConsentRecord } from "../public/publicConsentTypes";

const storageKey = "anm_public_consent";

export class ConsentStorageService {
  getStoredConsent(): PublicConsentRecord | undefined {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as PublicConsentRecord;
      if (!parsed.expiresAt || Date.parse(parsed.expiresAt) <= Date.now()) {
        this.clearStoredConsent();
        return undefined;
      }
      return parsed;
    } catch {
      return undefined;
    }
  }

  saveConsent(record: PublicConsentRecord) {
    window.localStorage.setItem(storageKey, JSON.stringify(record));
    document.cookie = `anm_consent=${encodeURIComponent(record.policyVersion)}; Path=/; Max-Age=15552000; SameSite=Lax`;
  }

  clearStoredConsent() {
    window.localStorage.removeItem(storageKey);
    document.cookie = "anm_consent=; Path=/; Max-Age=0; SameSite=Lax";
  }
}

export const consentStorageService = new ConsentStorageService();
