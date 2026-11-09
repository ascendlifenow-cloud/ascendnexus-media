import type { AdminNavigationGroup } from "./adminNavigationTypes";

export const adminNavigationGroups: AdminNavigationGroup[] = [
  { groupKey: "overview", label: "Overview", order: 10, defaultExpanded: true },
  { groupKey: "content", label: "Create & Edit", order: 20, defaultExpanded: true },
  { groupKey: "media_operations", label: "Prepare Media", order: 30, defaultExpanded: true },
  { groupKey: "publishing", label: "Review & Publish", order: 40, defaultExpanded: true },
  { groupKey: "members", label: "Members & Access", order: 50, defaultExpanded: false },
  { groupKey: "system", label: "System & Settings", order: 60, defaultExpanded: false },
];
