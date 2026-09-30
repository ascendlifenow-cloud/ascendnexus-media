import type { PublicSiteNavigationLink } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { AdminSettingsActions } from "./AdminSettingsActions";
import { AdminSettingsPanel } from "./AdminSettingsPanel";

interface AdminLinkListPanelProps {
  title: string;
  description: string;
  actionLabel: string;
  links: readonly PublicSiteNavigationLink[];
}

export function AdminLinkListPanel({ title, description, actionLabel, links }: AdminLinkListPanelProps) {
  return (
    <AdminSettingsPanel title={title} description={description}>
      {links.length ? (
        <div className="grid gap-2">
          {links.map((link) => (
            <div key={`${link.label}-${link.href}`} className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-black/18 p-3 text-sm">
              <span className="font-semibold text-white">{link.label || "Missing label"}</span>
              <span className="break-all text-white/52">{link.href || "Missing href"}</span>
              <Badge variant={link.enabled ? "pink" : "neutral"}>{link.enabled ? "Enabled" : "Disabled"}</Badge>
              <Badge variant="glass">{link.external ? "External" : "Internal"}</Badge>
              <span className="ml-auto text-white/42">Order {link.sortOrder}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/58">No links configured.</p>
      )}
      <div className="mt-4">
        <AdminSettingsActions label={actionLabel} />
      </div>
    </AdminSettingsPanel>
  );
}
