import { RotateCcw, Save, Settings } from "lucide-react";
import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { Button } from "../../components/ui/Button";
import {
  AdminAnalyticsSettingsPanel,
  AdminBrandAssetsPanel,
  AdminCdnReadinessPanel,
  AdminDeploymentReadinessPanel,
  AdminLinkListPanel,
  AdminSettingsStats,
  AdminSettingsWarningList,
  AdminSiteIdentityPanel,
  AdminSocialContactPanel,
  AdminStorageProviderReadinessPanel,
  AdminThemeSettingsPanel,
} from "../components/settings";
import { PublicAssetSyncReportPanel } from "../components/asset-sync";
import { AdminPageHeader } from "../components";
import { useAdminSiteSettings } from "../hooks/useAdminSiteSettings";
import { usePublishAdminSiteConfig, useUpdateAdminSiteConfig } from "../../hooks/admin/useAdminContent";

const adminSettingsMetadata = {
  title: "Admin Settings | Ascend Nexus Media",
  description: "Manage Ascend Nexus Media public site settings and readiness.",
  type: "custom" as const,
  noIndex: true,
};

export function AdminSettingsPage() {
  const settingsQuery = useAdminSiteSettings();
  const updateSiteConfig = useUpdateAdminSiteConfig();
  const publishSiteConfig = usePublishAdminSiteConfig();
  const hasServiceError = settingsQuery.isError || settingsQuery.data?.ok === false;
  const settings = settingsQuery.settings;
  const isSaving = updateSiteConfig.isPending || publishSiteConfig.isPending;

  return (
    <div className="grid gap-6">
      <SEOHead metadata={adminSettingsMetadata} disableSocial />
      <AdminPageHeader
        title="Site Settings"
        description="Manage Ascend Nexus Media site identity, brand assets, navigation, footer links, social links, analytics, theme options, and public configuration readiness."
        status="ready"
        actions={
          <>
            <Button type="button" variant="primary" disabled={isSaving || !settingsQuery.siteConfig} onClick={() => publishSiteConfig.mutate()}>
              <Settings className="h-4 w-4" aria-hidden />
              Publish
            </Button>
            <Button type="button" variant="glass" disabled={isSaving || !settingsQuery.siteConfig} onClick={() => settingsQuery.siteConfig ? updateSiteConfig.mutate(settingsQuery.siteConfig) : undefined}>
              <Save className="h-4 w-4" aria-hidden />
              Save Changes
            </Button>
            <Button type="button" variant="glass" disabled={isSaving} onClick={() => void settingsQuery.refetch()}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reload Draft
            </Button>
          </>
        }
      />

      {settingsQuery.isLoading ? <GridSkeleton itemCount={8} variant="block" columns="sm:grid-cols-2 xl:grid-cols-4" /> : null}
      {hasServiceError ? <PublicLoadingErrorState /> : null}

      {!settingsQuery.isLoading && !hasServiceError ? (
        <>
          <AdminSettingsStats settings={settings} />
          <div className="grid gap-6 xl:grid-cols-2">
            <AdminSiteIdentityPanel settings={settings} />
            <AdminBrandAssetsPanel settings={settings} />
            <AdminLinkListPanel
              title="Navigation Settings"
              description="Public header navigation links and future ordering controls."
              actionLabel="navigation settings"
              links={settings.navigation}
            />
            <AdminLinkListPanel
              title="Footer Settings"
              description="Footer links, ecosystem references, and legal/footer readiness."
              actionLabel="footer settings"
              links={settings.footer}
            />
            <AdminSocialContactPanel settings={settings} />
            <AdminAnalyticsSettingsPanel settings={settings} />
            <AdminThemeSettingsPanel settings={settings} />
            <AdminDeploymentReadinessPanel settings={settings} />
            <AdminStorageProviderReadinessPanel />
            <AdminCdnReadinessPanel />
          </div>
          <PublicAssetSyncReportPanel />
          <AdminSettingsWarningList settings={settings} />
        </>
      ) : null}
    </div>
  );
}
