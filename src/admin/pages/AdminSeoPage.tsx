import { Download, RefreshCw, ScanSearch } from "lucide-react";
import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { Button } from "../../components/ui/Button";
import { useAdminMetadataRecords, useAdminSeoHealth } from "../../hooks/admin/useAdminContent";
import {
  AdminMetadataEmptyState,
  AdminMetadataPreviewPanel,
  AdminMetadataTable,
  AdminMetadataWarningPanel,
  AdminSeoStats,
  AdminSeoToolbar,
} from "../components/seo";
import { AdminPageHeader } from "../components";
import { useAdminMetadataFilters } from "../hooks/useAdminMetadataFilters";
import { useSelectedMetadataRecord } from "../hooks/useSelectedMetadataRecord";

const adminSeoMetadata = {
  title: "Admin SEO | Ascend Nexus Media",
  description: "Manage Ascend Nexus Media SEO and social share metadata.",
  type: "custom" as const,
  noIndex: true,
};

export function AdminSeoPage() {
  const metadataQuery = useAdminMetadataRecords();
  const seoHealthQuery = useAdminSeoHealth();
  const records = metadataQuery.data?.ok ? metadataQuery.data.data : [];
  const hasServiceError = metadataQuery.isError || metadataQuery.data?.ok === false;
  const { selectedRecord, selectRecord, clearSelectedRecord } = useSelectedMetadataRecord();
  const {
    searchQuery,
    entityTypeFilter,
    statusFilter,
    sortMode,
    filteredRecords,
    hasFilters,
    setSearchQuery,
    setEntityTypeFilter,
    setStatusFilter,
    setSortMode,
    clearFilters,
  } = useAdminMetadataFilters(records);

  return (
    <div className="grid gap-6">
      <SEOHead metadata={adminSeoMetadata} disableSocial />
      <AdminPageHeader
        title="SEO & Social Metadata"
        description="Manage Ascend Nexus Media public page titles, descriptions, social share previews, canonical paths, preview images, and public discoverability metadata."
        status="ready"
        actions={
          <>
            <Button type="button" variant="primary" disabled={metadataQuery.isFetching} onClick={() => void metadataQuery.refetch()}>
              <ScanSearch className="h-4 w-4" aria-hidden />
              Scan Metadata
            </Button>
            <Button type="button" variant="glass" disabled={metadataQuery.isFetching} onClick={() => void metadataQuery.refetch()}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Refresh
            </Button>
            <Button type="button" variant="glass" onClick={() => {
              const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "ascend-nexus-metadata-export.json";
              link.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="h-4 w-4" aria-hidden />
              Export Metadata
            </Button>
          </>
        }
      />

      {metadataQuery.isLoading ? <GridSkeleton itemCount={8} variant="block" columns="sm:grid-cols-2 xl:grid-cols-4" /> : null}
      {hasServiceError ? <PublicLoadingErrorState /> : null}

      {!metadataQuery.isLoading && !hasServiceError ? (
        <>
          {seoHealthQuery.data?.data ? (
            <section className="rounded-xl border border-white/10 bg-black/25 p-5 shadow-sm" aria-labelledby="seo-launch-health-heading">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">Production indexing</p>
                  <h2 id="seo-launch-health-heading" className="mt-2 text-xl font-semibold text-white">
                    {seoHealthQuery.data.data.overallStatus === "blocked" ? "Indexing launch blocked" : seoHealthQuery.data.data.overallStatus === "warning" ? "Indexing launch has warnings" : "Indexing launch healthy"}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-300">
                    {seoHealthQuery.data.data.blockingIssues[0] ?? seoHealthQuery.data.data.warnings[0] ?? "Sitemap, robots, metadata, structured data, and social image checks are passing."}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-lg bg-white/5 p-3">
                    <dt className="text-slate-400">URLs</dt>
                    <dd className="mt-1 text-lg font-semibold text-white">{seoHealthQuery.data.data.urlCount}</dd>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3">
                    <dt className="text-slate-400">Metadata</dt>
                    <dd className="mt-1 text-lg font-semibold text-white">{seoHealthQuery.data.data.metadataIssueCount}</dd>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3">
                    <dt className="text-slate-400">Schemas</dt>
                    <dd className="mt-1 text-lg font-semibold text-white">{seoHealthQuery.data.data.structuredDataIssueCount}</dd>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3">
                    <dt className="text-slate-400">Verified</dt>
                    <dd className="mt-1 text-lg font-semibold text-white">{seoHealthQuery.data.data.searchEngineVerificationCount}</dd>
                  </div>
                </dl>
              </div>
            </section>
          ) : null}
          <AdminSeoStats records={records} />
          <AdminSeoToolbar
            searchQuery={searchQuery}
            entityTypeFilter={entityTypeFilter}
            statusFilter={statusFilter}
            sortMode={sortMode}
            resultCount={filteredRecords.length}
            totalCount={records.length}
            onSearchChange={setSearchQuery}
            onEntityTypeFilterChange={setEntityTypeFilter}
            onStatusFilterChange={setStatusFilter}
            onSortModeChange={setSortMode}
            onClearFilters={clearFilters}
          />

          {filteredRecords.length > 0 ? (
            <AdminMetadataTable records={filteredRecords} onViewRecord={selectRecord} />
          ) : (
            <AdminMetadataEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
          )}

          <AdminMetadataPreviewPanel record={selectedRecord} onClose={clearSelectedRecord} />
          <AdminMetadataWarningPanel records={records} />
        </>
      ) : null}
    </div>
  );
}
