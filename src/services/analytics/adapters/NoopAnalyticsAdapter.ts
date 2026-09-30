import type { PublicAnalyticsEvent } from "../../../models/analytics";
import type { AnalyticsProviderAdapter } from "./AnalyticsProviderAdapter";

export class NoopAnalyticsAdapter implements AnalyticsProviderAdapter {
  async sendEvent(_event: PublicAnalyticsEvent): Promise<void> {
    return Promise.resolve();
  }
}
