import { defaultAnalyticsConfig } from "../../utils/analytics/analyticsUtils";
import { useAdminSiteConfig } from "../../hooks/admin/useAdminContent";
import { buildAdminSettingsViewModel } from "../utils/adminSettingsUtils";

export function useAdminSiteSettings() {
  const query = useAdminSiteConfig();
  const siteConfig = query.data?.ok ? query.data.data : undefined;
  const settings = buildAdminSettingsViewModel(siteConfig, defaultAnalyticsConfig);

  return {
    ...query,
    siteConfig,
    analyticsConfig: defaultAnalyticsConfig,
    settings,
  };
}
