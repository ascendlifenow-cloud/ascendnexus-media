import { useAdminSiteConfig } from "../../hooks/admin/useAdminContent";

export function useAdminHomepageConfig() {
  const query = useAdminSiteConfig();
  const siteConfig = query.data?.ok ? query.data.data : undefined;

  return {
    ...query,
    siteConfig,
    homepageSections: siteConfig?.homepageSections ?? [],
  };
}
