import type { PublicAnalyticsEvent } from "../../../models/analytics";
import type { AnalyticsProviderAdapter } from "./AnalyticsProviderAdapter";

export class ConsoleAnalyticsAdapter implements AnalyticsProviderAdapter {
  async sendEvent(event: PublicAnalyticsEvent): Promise<void> {
    console.info("[ANM Analytics]", event);
  }
}
