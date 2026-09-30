import { useMemo, useState } from "react";
import type { MediaProcessingJob } from "../../models/media";
import {
  filterProcessingJobs,
  groupJobsByStatus,
  sortProcessingJobs,
  type ProcessingAssetTypeFilter,
  type ProcessingJobTypeFilter,
  type ProcessingQueueFilter,
  type ProcessingSortMode,
  type ProcessingStatusFilter,
  type ProcessingTabKey,
} from "../utils/mediaProcessingAdminUtils";

export const useAdminProcessingFilters = (jobs: readonly MediaProcessingJob[]) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProcessingStatusFilter>("all");
  const [jobTypeFilter, setJobTypeFilter] = useState<ProcessingJobTypeFilter>("all");
  const [queueFilter, setQueueFilter] = useState<ProcessingQueueFilter>("all");
  const [assetTypeFilter, setAssetTypeFilter] = useState<ProcessingAssetTypeFilter>("all");
  const [sortMode, setSortMode] = useState<ProcessingSortMode>("newest");
  const [activeTab, setActiveTab] = useState<ProcessingTabKey>("all");

  const filteredJobs = useMemo(() => sortProcessingJobs(filterProcessingJobs(jobs, {
    searchQuery,
    statusFilter,
    jobTypeFilter,
    queueFilter,
    assetTypeFilter,
    activeTab,
  }), sortMode), [activeTab, assetTypeFilter, jobTypeFilter, jobs, queueFilter, searchQuery, sortMode, statusFilter]);

  const tabCounts = useMemo(() => groupJobsByStatus(jobs), [jobs]);
  const jobTypes = useMemo(() => [...new Set(jobs.map((job) => job.jobType))].sort(), [jobs]);
  const assetTypes = useMemo(() => [...new Set(jobs.map((job) => job.input?.assetType).filter(Boolean) as string[])].sort(), [jobs]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setJobTypeFilter("all");
    setQueueFilter("all");
    setAssetTypeFilter("all");
    setSortMode("newest");
    setActiveTab("all");
  };

  return {
    searchQuery,
    statusFilter,
    jobTypeFilter,
    queueFilter,
    assetTypeFilter,
    sortMode,
    activeTab,
    filteredJobs,
    tabCounts,
    jobTypes,
    assetTypes,
    setSearchQuery,
    setStatusFilter,
    setJobTypeFilter,
    setQueueFilter,
    setAssetTypeFilter,
    setSortMode,
    setActiveTab,
    clearFilters,
  };
};
