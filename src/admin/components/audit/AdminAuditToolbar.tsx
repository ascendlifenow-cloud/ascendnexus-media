import type { AdminAuditActionType, AdminAuditEntityType, AdminAuditEventType } from "../../../models/admin";
import type { AdminAuditSortMode } from "../../utils/adminAuditUtils";
import { formatAuditActionType, formatAuditEntityType, formatAuditEventType } from "../../utils/adminAuditUtils";
import { Button } from "../../../components/ui/Button";

const eventTypeOptions: Array<AdminAuditEventType | "all"> = ["all", "content", "publishing", "media", "gallery", "homepage", "metadata", "settings", "preview", "system"];
const actionTypeOptions: Array<AdminAuditActionType | "all"> = ["all", "create", "update", "publish", "archive", "restore", "preview", "validate", "settings_update", "metadata_update"];
const entityTypeOptions: Array<AdminAuditEntityType | "all"> = ["all", "artist", "release", "media_asset", "gallery_item", "homepage_section", "seo_metadata", "site_config"];
const sortOptions: Array<{ value: AdminAuditSortMode; label: string }> = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "entity_type", label: "Entity Type" },
  { value: "action_type", label: "Action Type" },
];

interface AdminAuditToolbarProps {
  searchQuery: string;
  eventTypeFilter: AdminAuditEventType | "all";
  actionTypeFilter: AdminAuditActionType | "all";
  entityTypeFilter: AdminAuditEntityType | "all";
  sortMode: AdminAuditSortMode;
  resultCount: number;
  totalCount: number;
  hasFilters: boolean;
  onSearchChange: (value: string) => void;
  onEventTypeChange: (value: AdminAuditEventType | "all") => void;
  onActionTypeChange: (value: AdminAuditActionType | "all") => void;
  onEntityTypeChange: (value: AdminAuditEntityType | "all") => void;
  onSortModeChange: (value: AdminAuditSortMode) => void;
  onClearFilters: () => void;
}

export function AdminAuditToolbar({
  searchQuery,
  eventTypeFilter,
  actionTypeFilter,
  entityTypeFilter,
  sortMode,
  resultCount,
  totalCount,
  hasFilters,
  onSearchChange,
  onEventTypeChange,
  onActionTypeChange,
  onEntityTypeChange,
  onSortModeChange,
  onClearFilters,
}: AdminAuditToolbarProps) {
  return (
    <section className="rounded-anm-panel border border-white/10 bg-anm-surface/80 p-4" aria-label="Audit filters">
      <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))_auto]">
        <label className="grid gap-2 text-sm font-semibold text-white/72">
          Search audit events
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search summary, entity, user, route..."
            className="anm-focus min-h-11 rounded-md border border-white/10 bg-black/24 px-3 text-white placeholder:text-white/34"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/72">
          Event
          <select className="anm-focus min-h-11 rounded-md border border-white/10 bg-black/24 px-3 text-white" value={eventTypeFilter} onChange={(event) => onEventTypeChange(event.target.value as AdminAuditEventType | "all")}>
            {eventTypeOptions.map((option) => <option key={option} value={option}>{formatAuditEventType(option)}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/72">
          Action
          <select className="anm-focus min-h-11 rounded-md border border-white/10 bg-black/24 px-3 text-white" value={actionTypeFilter} onChange={(event) => onActionTypeChange(event.target.value as AdminAuditActionType | "all")}>
            {actionTypeOptions.map((option) => <option key={option} value={option}>{formatAuditActionType(option)}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/72">
          Entity
          <select className="anm-focus min-h-11 rounded-md border border-white/10 bg-black/24 px-3 text-white" value={entityTypeFilter} onChange={(event) => onEntityTypeChange(event.target.value as AdminAuditEntityType | "all")}>
            {entityTypeOptions.map((option) => <option key={option} value={option}>{formatAuditEntityType(option)}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/72">
          Sort
          <select className="anm-focus min-h-11 rounded-md border border-white/10 bg-black/24 px-3 text-white" value={sortMode} onChange={(event) => onSortModeChange(event.target.value as AdminAuditSortMode)}>
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="button" variant="glass" disabled={!hasFilters} onClick={onClearFilters}>
            Clear
          </Button>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/52">
        Showing <span className="font-semibold text-white">{resultCount}</span> of <span className="font-semibold text-white">{totalCount}</span> events.
      </p>
    </section>
  );
}
