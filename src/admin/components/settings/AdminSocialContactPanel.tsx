import type { AdminSettingsViewModel } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { AdminSettingsActions } from "./AdminSettingsActions";
import { AdminSettingsPanel } from "./AdminSettingsPanel";

interface AdminSocialContactPanelProps {
  settings: AdminSettingsViewModel;
}

export function AdminSocialContactPanel({ settings }: AdminSocialContactPanelProps) {
  const socialEntries = Object.entries(settings.socialContact.socialLinks).filter(([, url]) => Boolean(url));

  return (
    <AdminSettingsPanel title="Social & Contact" description="Social links, contact page readiness, and newsletter flags.">
      <div className="grid gap-3">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Contact Email</p>
          <p className="mt-1 text-white/76">{settings.socialContact.contactEmail || "Missing contact email"}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Contact CTA</p>
          <p className="mt-1 text-sm leading-6 text-white/62">{settings.socialContact.contactCtaText || "Missing contact CTA text"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={settings.socialContact.newsletterEnabled ? "pink" : "neutral"}>Newsletter {settings.socialContact.newsletterEnabled ? "Enabled" : "Disabled"}</Badge>
          <Badge variant={settings.socialContact.contactPageEnabled ? "pink" : "neutral"}>Contact Page {settings.socialContact.contactPageEnabled ? "Enabled" : "Disabled"}</Badge>
        </div>
        <div className="grid gap-2">
          {socialEntries.length ? socialEntries.map(([platform, url]) => (
            <div key={platform} className="flex flex-wrap gap-2 rounded-md border border-white/10 bg-black/18 p-3 text-sm">
              <span className="font-semibold text-white">{platform}</span>
              <span className="break-all text-white/52">{url}</span>
            </div>
          )) : <p className="text-sm text-white/58">No social links configured.</p>}
        </div>
      </div>
      <div className="mt-4">
        <AdminSettingsActions label="social and contact settings" />
      </div>
    </AdminSettingsPanel>
  );
}
