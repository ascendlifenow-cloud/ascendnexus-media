import type { MediaProcessingJobType, MediaProcessingJobStatusValue } from "../../../../models/media";
import type { ProcessingQueueFilter, ProcessingSortMode } from "../../../utils/mediaProcessingAdminUtils";

interface Props {
  searchQuery: string;
  statusFilter: "all" | MediaProcessingJobStatusValue;
  jobTypeFilter: "all" | MediaProcessingJobType;
  queueFilter: ProcessingQueueFilter;
  assetTypeFilter: string;
  sortMode: ProcessingSortMode;
  jobTypes: MediaProcessingJobType[];
  assetTypes: string[];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: "all" | MediaProcessingJobStatusValue) => void;
  onJobTypeFilterChange: (value: "all" | MediaProcessingJobType) => void;
  onQueueFilterChange: (value: ProcessingQueueFilter) => void;
  onAssetTypeFilterChange: (value: string) => void;
  onSortModeChange: (value: ProcessingSortMode) => void;
  onClearFilters: () => void;
}

const statuses: Array<"all" | MediaProcessingJobStatusValue> = ["all", "queued", "delayed", "active", "processing", "completed", "failed", "retrying", "canceled", "dead_letter", "skipped"];
const queues: ProcessingQueueFilter[] = ["all", "image", "audio", "storage", "cdn", "publication", "maintenance", "dead_letter"];
const sortModes: ProcessingSortMode[] = ["newest", "oldest", "highest_progress", "lowest_progress", "most_attempts", "job_type", "status", "priority"];

const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export function AdminProcessingToolbar(props: Props) {
  return (
    <div className="grid gap-3">
      <input
        value={props.searchQuery}
        onChange={(event) => props.onSearchChange(event.target.value)}
        placeholder="Search jobs, assets, queues, errors"
        className="w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-anm-gold"
      />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <select className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white" value={props.statusFilter} onChange={(event) => props.onStatusFilterChange(event.target.value as never)}>
          {statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
        </select>
        <select className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white" value={props.jobTypeFilter} onChange={(event) => props.onJobTypeFilterChange(event.target.value as never)}>
          <option value="all">All Types</option>
          {props.jobTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
        </select>
        <select className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white" value={props.queueFilter} onChange={(event) => props.onQueueFilterChange(event.target.value as ProcessingQueueFilter)}>
          {queues.map((queue) => <option key={queue} value={queue}>{label(queue)}</option>)}
        </select>
        <select className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white" value={props.assetTypeFilter} onChange={(event) => props.onAssetTypeFilterChange(event.target.value)}>
          <option value="all">All Assets</option>
          {props.assetTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
        </select>
        <select className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white" value={props.sortMode} onChange={(event) => props.onSortModeChange(event.target.value as ProcessingSortMode)}>
          {sortModes.map((mode) => <option key={mode} value={mode}>{label(mode)}</option>)}
        </select>
        <button type="button" className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/70 hover:border-anm-gold/50" onClick={props.onClearFilters}>
          Clear
        </button>
      </div>
    </div>
  );
}
