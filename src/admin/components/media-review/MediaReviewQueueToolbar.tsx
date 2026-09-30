import type { MediaAssetType } from "../../../models/admin";
import type { MediaCategory } from "../../../models/media";
import type { MediaReviewSortMode, MediaReviewStateFilter } from "../../../utils/media/mediaAssignmentReviewUtils";
import { formatMediaAssetType } from "../../utils/adminMediaUtils";

const assetTypes: Array<MediaAssetType | "all"> = ["all", "cover_art", "artist_profile", "artist_character_art", "audio_preview", "full_song", "gallery_image", "promo_graphic", "logo", "social_preview", "custom_image", "custom_audio", "custom"];
const states: MediaReviewStateFilter[] = ["all", "unassigned", "needs_review", "suggested_assignment", "assignment_failed", "kept_unassigned"];
const categories: Array<MediaCategory | "all"> = ["all", "image", "audio", "video", "custom"];
const sortModes: MediaReviewSortMode[] = ["newest", "oldest", "asset_type", "confidence", "file_name"];

interface MediaReviewQueueToolbarProps {
  searchQuery: string;
  assignmentState: MediaReviewStateFilter;
  mediaCategory: MediaCategory | "all";
  assetType: MediaAssetType | "all";
  sortMode: MediaReviewSortMode;
  resultCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onAssignmentStateChange: (value: MediaReviewStateFilter) => void;
  onMediaCategoryChange: (value: MediaCategory | "all") => void;
  onAssetTypeChange: (value: MediaAssetType | "all") => void;
  onSortModeChange: (value: MediaReviewSortMode) => void;
  onClearFilters: () => void;
}

const selectClass = "min-h-11 rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20";

export function MediaReviewQueueToolbar({
  searchQuery,
  assignmentState,
  mediaCategory,
  assetType,
  sortMode,
  resultCount,
  totalCount,
  onSearchChange,
  onAssignmentStateChange,
  onMediaCategoryChange,
  onAssetTypeChange,
  onSortModeChange,
  onClearFilters,
}: MediaReviewQueueToolbarProps) {
  return (
    <section className="grid gap-4 rounded-md border border-white/10 bg-black/18 p-4" aria-label="Review queue filters">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/58">Showing <span className="font-semibold text-white">{resultCount}</span> of {totalCount} review items</p>
        <button type="button" className="min-h-10 rounded-md border border-white/12 px-3 text-sm font-semibold text-white" onClick={onClearFilters}>Clear Filters</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-2 md:col-span-2 xl:col-span-1">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/44">Search</span>
          <input value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} className={selectClass} placeholder="Title, filename, asset id" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/44">State</span>
          <select value={assignmentState} onChange={(event) => onAssignmentStateChange(event.target.value as MediaReviewStateFilter)} className={selectClass}>
            {states.map((state) => <option key={state} value={state}>{state.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/44">Category</span>
          <select value={mediaCategory} onChange={(event) => onMediaCategoryChange(event.target.value as MediaCategory | "all")} className={selectClass}>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/44">Asset Type</span>
          <select value={assetType} onChange={(event) => onAssetTypeChange(event.target.value as MediaAssetType | "all")} className={selectClass}>
            {assetTypes.map((type) => <option key={type} value={type}>{type === "all" ? "all" : formatMediaAssetType(type)}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/44">Sort</span>
          <select value={sortMode} onChange={(event) => onSortModeChange(event.target.value as MediaReviewSortMode)} className={selectClass}>
            {sortModes.map((mode) => <option key={mode} value={mode}>{mode.replace(/_/g, " ")}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}
