import type { AdminNavigationGroup } from "./adminNavigationTypes";

export const adminNavigationGroups: AdminNavigationGroup[] = [
  { groupKey: "overview", label: "Overview", order: 10, defaultExpanded: true },
  { groupKey: "content", label: "Content", order: 20, defaultExpanded: true },
  { groupKey: "media_operations", label: "Media Operations", order: 30, defaultExpanded: true },
  { groupKey: "publishing", label: "Publishing", order: 40, defaultExpanded: true },
  { groupKey: "members", label: "Members", order: 50, defaultExpanded: true },
  { groupKey: "system", label: "System", order: 60, defaultExpanded: true },
];
