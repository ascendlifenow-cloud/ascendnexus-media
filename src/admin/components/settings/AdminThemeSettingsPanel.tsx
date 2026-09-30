import type { AdminSettingsViewModel } from "../../../models/admin";
import { AdminSettingsActions } from "./AdminSettingsActions";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminSettingsStatusBadge } from "./AdminSettingsStatusBadge";

interface AdminThemeSettingsPanelProps {
  settings: AdminSettingsViewModel;
}

export function AdminThemeSettingsPanel({ settings }: AdminThemeSettingsPanelProps) {
  return (
    <AdminSettingsPanel title="Theme Settings" description="Theme token readiness and future override structure.">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-white/42">Current Theme</dt>
          <dd className="mt-1 font-semibold text-white">{settings.theme.name}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-white/42">Dark Mode</dt>
          <dd className="mt-2"><AdminSettingsStatusBadge status={settings.theme.darkModeDefault} /></dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-white/42">Artist Themes</dt>
          <dd className="mt-2"><AdminSettingsStatusBadge status={settings.theme.artistThemeReady} /></dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-white/42">Overrides</dt>
          <dd className="mt-2"><AdminSettingsStatusBadge status={settings.theme.overrideStatus} /></dd>
        </div>
      </dl>
      <div className="mt-4">
        <AdminSettingsActions label="theme settings" />
      </div>
    </AdminSettingsPanel>
  );
}
