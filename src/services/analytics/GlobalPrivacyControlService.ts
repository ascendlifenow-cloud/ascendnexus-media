export class GlobalPrivacyControlService {
  isGpcEnabled(): boolean {
    return Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl);
  }

  isDntEnabled(): boolean {
    return navigator.doNotTrack === "1" || (window as Window & { doNotTrack?: string }).doNotTrack === "1";
  }
}

export const globalPrivacyControlService = new GlobalPrivacyControlService();
