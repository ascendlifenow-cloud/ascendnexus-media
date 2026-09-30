import { Eye, EyeOff, LayoutDashboard, Layers3, Sparkles, Wand2 } from "lucide-react";
import type { PublicSiteConfig } from "../../../models/admin";
import { getAdminHomepageStats } from "../../utils/adminHomepageUtils";

interface AdminHomepageStatsProps {
  siteConfig?: PublicSiteConfig;
}

export function AdminHomepageStats({ siteConfig }: AdminHomepageStatsProps) {
  const stats = getAdminHomepageStats(siteConfig);
  const items = [
    { label: "Total Sections", value: stats.totalSections, icon: LayoutDashboard },
    { label: "Enabled", value: stats.enabledSections, icon: Eye },
    { label: "Disabled", value: stats.disabledSections, icon: EyeOff },
    { label: "Hero Sections", value: stats.heroSections, icon: Sparkles },
    { label: "Featured", value: stats.featuredSections, icon: Layers3 },
    { label: "Custom", value: stats.customSections, icon: Wand2 },
  ];

  return (
    <section className="flex flex-wrap items-center gap-2" aria-label="Homepage management summary">
      {items.map(({ label, value, icon: Icon }) => (
        <span
          key={label}
          title={label}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-white/82 shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
        >
          <Icon className="h-4 w-4 text-anm-gold" aria-hidden />
          <span aria-hidden>{value}</span>
          <span className="sr-only">{label}: {value}</span>
        </span>
      ))}
    </section>
  );
}
