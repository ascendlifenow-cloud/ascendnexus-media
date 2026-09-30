import type { AdminSettingsViewModel } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { AdminSettingsActions } from "./AdminSettingsActions";
import { AdminSettingsPanel } from "./AdminSettingsPanel";

interface AdminAnalyticsSettingsPanelProps {
  settings: AdminSettingsViewModel;
}

export function AdminAnalyticsSettingsPanel({ settings }: AdminAnalyticsSettingsPanelProps) {
  const analytics = settings.analytics;
  const flags = [
    ["Page Views", analytics.trackPageViews],
    ["Clicks", analytics.trackClicks],
    ["Audio Preview", analytics.trackAudioPreview],
    ["Search", analytics.trackSearch],
    ["Browse", analytics.trackBrowse],
    ["Gallery", analytics.trackGallery],
  ];

  return (
    <AdminSettingsPanel title="Analytics Settings" description="Event tracking readiness without exposing private provider configuration.">
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={analytics.enabled ? "pink" : "neutral"}>{analytics.enabled ? "Enabled" : "Disabled"}</Badge>
          <Badge variant="glass">Provider: {analytics.provider}</Badge>
          <Badge variant={analytics.debug ? "sunrise" : "neutral"}>Debug {analytics.debug ? "On" : "Off"}</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {flags.map(([label, enabled]) => (
            <div key={label as string} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/18 p-3 text-sm">
              <span className="text-white/68">{label}</span>
              <Badge variant={enabled ? "pink" : "neutral"}>{enabled ? "Tracked" : "Off"}</Badge>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <AdminSettingsActions label="analytics settings" />
      </div>
    </AdminSettingsPanel>
  );
}
