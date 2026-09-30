import { AtSign, Image, Link2, Palette, Search, Settings } from "lucide-react";
import type { AdminSettingsViewModel } from "../../../models/admin";
import { AdminStatCard } from "../AdminStatCard";
import { getAdminSettingsStats } from "../../utils/adminSettingsUtils";

interface AdminSettingsStatsProps {
  settings: AdminSettingsViewModel;
}

export function AdminSettingsStats({ settings }: AdminSettingsStatsProps) {
  const stats = getAdminSettingsStats(settings);

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8" aria-label="Settings summary">
      <AdminStatCard label="Site Name" value={stats.siteName} icon={<Settings className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Brand Assets" value={stats.brandAssets} icon={<Image className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Nav Links" value={stats.navigationLinks} icon={<Link2 className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Footer Links" value={stats.footerLinks} icon={<Link2 className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Social Links" value={stats.socialLinks} icon={<AtSign className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Analytics" value={stats.analyticsStatus} icon={<Search className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Theme" value={stats.themeStatus} icon={<Palette className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Missing" value={stats.missingRequired} icon={<Settings className="h-5 w-5" aria-hidden />} />
    </section>
  );
}
