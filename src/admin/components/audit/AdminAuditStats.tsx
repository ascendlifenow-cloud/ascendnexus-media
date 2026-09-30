import { FileClock, FileText, History, Search, Settings, Sparkles } from "lucide-react";
import type { AdminAuditEvent } from "../../../models/admin";
import { AdminStatCard } from "../AdminStatCard";
import { getAdminAuditStats } from "../../utils/adminAuditUtils";

export function AdminAuditStats({ events }: { events: readonly AdminAuditEvent[] }) {
  const stats = getAdminAuditStats(events);
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" aria-label="Audit summary">
      <AdminStatCard label="Total Events" value={stats.totalEvents} icon={<History className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Publishing" value={stats.publishingEvents} icon={<Sparkles className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Content Updates" value={stats.contentUpdates} icon={<FileText className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Metadata" value={stats.metadataUpdates} icon={<Search className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Settings" value={stats.settingsUpdates} icon={<Settings className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Previews" value={stats.previewEvents} icon={<FileClock className="h-5 w-5" aria-hidden />} />
    </section>
  );
}
