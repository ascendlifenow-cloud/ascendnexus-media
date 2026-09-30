import { AlertTriangle, FileText, ImageOff, Search, Tags, UsersRound } from "lucide-react";
import type { AdminMetadataRecord } from "../../../models/admin";
import { AdminStatCard } from "../AdminStatCard";
import { getAdminMetadataStats } from "../../utils/adminMetadataUtils";

interface AdminSeoStatsProps {
  records: readonly AdminMetadataRecord[];
}

export function AdminSeoStats({ records }: AdminSeoStatsProps) {
  const stats = getAdminMetadataStats(records);

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8" aria-label="Metadata summary">
      <AdminStatCard label="Total Records" value={stats.total} icon={<FileText className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Complete" value={stats.complete} icon={<Search className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Missing Titles" value={stats.missingSeoTitles} icon={<AlertTriangle className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Missing Desc." value={stats.missingDescriptions} icon={<AlertTriangle className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Missing Images" value={stats.missingSocialImages} icon={<ImageOff className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="No-Index" value={stats.noIndex} icon={<Search className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Artist Metadata" value={stats.artistMetadata} icon={<UsersRound className="h-5 w-5" aria-hidden />} />
      <AdminStatCard label="Release Metadata" value={stats.releaseMetadata} icon={<Tags className="h-5 w-5" aria-hidden />} />
    </section>
  );
}
