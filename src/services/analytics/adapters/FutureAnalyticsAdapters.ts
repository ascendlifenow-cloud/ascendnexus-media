import type { PublicAnalyticsEvent } from "../../../models/analytics";
import type { AnalyticsProviderAdapter } from "./AnalyticsProviderAdapter";

class FutureProviderPlaceholder implements AnalyticsProviderAdapter {
  async sendEvent(_event: PublicAnalyticsEvent): Promise<void> {
    return Promise.resolve();
  }
}

export class GoogleAnalyticsAdapter extends FutureProviderPlaceholder {}
export class PlausibleAnalyticsAdapter extends FutureProviderPlaceholder {}
export class PostHogAnalyticsAdapter extends FutureProviderPlaceholder {}
export class CustomApiAnalyticsAdapter extends FutureProviderPlaceholder {}
