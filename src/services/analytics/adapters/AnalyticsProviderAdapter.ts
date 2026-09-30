import type { PublicAnalyticsEvent } from "../../../models/analytics";

export interface AnalyticsProviderAdapter {
  sendEvent(event: PublicAnalyticsEvent): Promise<void>;
}
