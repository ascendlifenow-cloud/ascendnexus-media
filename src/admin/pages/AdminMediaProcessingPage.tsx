import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SEOHead } from "../../components/SEOHead";
import { Button } from "../../components/ui/Button";
import { LinkButton } from "../../components/ui/LinkButton";
import { AdminPageHeader, AdminSectionCard } from "../components";
import {
  AdminProcessingAttentionPanel,
  AdminProcessingHealthPanel,
  AdminProcessingJobDetailPanel,
  AdminProcessingJobTabs,
  AdminProcessingJobTable,
  AdminProcessingQueueCards,
  AdminProcessingStatsGrid,
  AdminProcessingToolbar,
  AdminQueueControlPanel,
  AdminWorkerHealthPanel,
  MediaAssetProcessingSummaryPanel,
} from "../components/media/processing";
import { useAdminMediaProcessing, useAdminProcessingFilters, useAssetProcessingSummary, useSelectedProcessingJob } from "../hooks";
import { buildProcessingAttentionSummary } from "../utils/mediaProcessingAdminUtils";

const adminMediaProcessingMetadata = {
  title: "Admin Media Processing | Ascend Nexus Media",
  description: "Monitor background media processing jobs, queues, workers, retries, and failures.",
  type: "custom" as const,
  noIndex: true,
};

export function AdminMediaProcessingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    jobs,
    health,
    loading,
    errors,
    stats,
    refresh,
    retryJob,
    cancelJob,
    pauseQueue,
    resumeQueue,
  } = useAdminMediaProcessing();
  const filters = useAdminProcessingFilters(jobs);
  const { selectedJob, selectedJobId, selectJob } = useSelectedProcessingJob(filters.filteredJobs.length ? filters.filteredJobs : jobs);
  const selectedAssetId = searchParams.get("assetId") ?? selectedJob?.assetId;
  const { summary: assetSummary, loading: assetSummaryLoading } = useAssetProcessingSummary(selectedAssetId);
  const attentionSummary = useMemo(() => buildProcessingAttentionSummary(jobs, health), [jobs, health]);
  const queueControls = useMemo(
    () => (health?.queueCounts ?? []).map((queue) => ({ queueName: queue.queueName, paused: queue.paused, queued: queue.queued })),
    [health],
  );

  useEffect(() => {
    const jobId = searchParams.get("jobId") ?? searchParams.get("processingJobId");
    if (jobId && jobs.some((job) => job.processingJobId === jobId)) selectJob(jobId);
  }, [jobs, searchParams, selectJob]);

  useEffect(() => {
    const uploadJobId = searchParams.get("uploadJobId");
    const assetId = searchParams.get("assetId");
    const queryValue = uploadJobId ?? assetId;
    if (queryValue && !filters.searchQuery) filters.setSearchQuery(queryValue);
  }, [filters, searchParams]);

  const handleSelectJob = (processingJobId: string) => {
    selectJob(processingJobId);
    const next = new URLSearchParams(searchParams);
    next.set("jobId", processingJobId);
    const job = jobs.find((item) => item.processingJobId === processingJobId);
    if (job?.assetId) next.set("assetId", job.assetId);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={adminMediaProcessingMetadata} disableSocial />
      <AdminPageHeader
        title="Media Processing"
        description="Monitor queued image, audio, storage, CDN, checksum, retry, and dead-letter work for uploaded media assets."
        status="ready"
      />

      <section
        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/18 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
        aria-label="Media processing summary and actions"
      >
        <AdminProcessingStatsGrid stats={stats} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary" onClick={() => void refresh()}>
            <RefreshCcw className="h-4 w-4" aria-hidden />
            Refresh Status
          </Button>
          <LinkButton to="/admin/media" variant="glass">
            Open Media Library
          </LinkButton>
        </div>
      </section>

      <AdminProcessingAttentionPanel
        summary={attentionSummary}
        onViewFailed={() => filters.setActiveTab(attentionSummary.deadLetterJobs ? "dead_letter" : "failed")}
      />
      <AdminProcessingHealthPanel health={health} />
      <AdminWorkerHealthPanel health={health} />
      <AdminProcessingQueueCards health={health} onPauseQueue={(queue) => void pauseQueue(queue)} onResumeQueue={(queue) => void resumeQueue(queue)} />
      <AdminQueueControlPanel queues={queueControls} onPause={(queue) => void pauseQueue(queue)} onResume={(queue) => void resumeQueue(queue)} />

      {errors.length ? (
        <AdminSectionCard title="Processing Notices">
          <div className="grid gap-2 text-sm text-amber-100">
            {errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        </AdminSectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <AdminSectionCard title={loading ? "Processing Jobs Loading" : "Processing Jobs"} description="Queued, active, completed, failed, and dead-letter jobs.">
          <div className="grid gap-4">
            <AdminProcessingJobTabs activeTab={filters.activeTab} counts={filters.tabCounts} onChange={filters.setActiveTab} />
            <AdminProcessingToolbar
              searchQuery={filters.searchQuery}
              statusFilter={filters.statusFilter}
              jobTypeFilter={filters.jobTypeFilter}
              queueFilter={filters.queueFilter}
              assetTypeFilter={filters.assetTypeFilter}
              sortMode={filters.sortMode}
              jobTypes={filters.jobTypes}
              assetTypes={filters.assetTypes}
              onSearchChange={filters.setSearchQuery}
              onStatusFilterChange={filters.setStatusFilter}
              onJobTypeFilterChange={filters.setJobTypeFilter}
              onQueueFilterChange={filters.setQueueFilter}
              onAssetTypeFilterChange={filters.setAssetTypeFilter}
              onSortModeChange={filters.setSortMode}
              onClearFilters={filters.clearFilters}
            />
            <AdminProcessingJobTable
              jobs={filters.filteredJobs}
              selectedJobId={selectedJobId}
              onSelectJob={handleSelectJob}
              onRetry={(id) => void retryJob(id)}
              onCancel={(id) => void cancelJob(id)}
            />
          </div>
        </AdminSectionCard>
        <div className="grid gap-6">
          <AdminProcessingJobDetailPanel job={selectedJob} onRetry={(id) => void retryJob(id)} onCancel={(id) => void cancelJob(id)} />
          <MediaAssetProcessingSummaryPanel summary={assetSummary} loading={assetSummaryLoading} assetId={selectedAssetId} />
        </div>
      </div>
    </div>
  );
}
