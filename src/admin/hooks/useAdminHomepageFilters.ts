import { useMemo, useState } from "react";
import type { PublicSiteConfigSection } from "../../models/admin";
import {
  filterAdminHomepageSections,
  getAvailableAdminHomepageSectionTypes,
  searchAdminHomepageSections,
  sortAdminHomepageSections,
  type AdminHomepageEnabledFilter,
  type AdminHomepageSectionTypeFilter,
  type AdminHomepageSortMode,
} from "../utils/adminHomepageUtils";

export function useAdminHomepageFilters(sections: readonly PublicSiteConfigSection[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [enabledFilter, setEnabledFilter] = useState<AdminHomepageEnabledFilter>("all");
  const [sectionTypeFilter, setSectionTypeFilter] = useState<AdminHomepageSectionTypeFilter>("all");
  const [sortMode, setSortMode] = useState<AdminHomepageSortMode>("sortOrder");

  const availableSectionTypes = useMemo(() => getAvailableAdminHomepageSectionTypes(sections), [sections]);

  const filteredSections = useMemo(() => {
    const searched = searchAdminHomepageSections(sections, searchQuery);
    const filtered = filterAdminHomepageSections(searched, enabledFilter, sectionTypeFilter);
    return sortAdminHomepageSections(filtered, sortMode);
  }, [enabledFilter, searchQuery, sectionTypeFilter, sections, sortMode]);

  const clearFilters = () => {
    setSearchQuery("");
    setEnabledFilter("all");
    setSectionTypeFilter("all");
    setSortMode("sortOrder");
  };

  return {
    searchQuery,
    enabledFilter,
    sectionTypeFilter,
    sortMode,
    availableSectionTypes,
    filteredSections,
    hasFilters: Boolean(searchQuery.trim() || enabledFilter !== "all" || sectionTypeFilter !== "all" || sortMode !== "sortOrder"),
    setSearchQuery,
    setEnabledFilter,
    setSectionTypeFilter,
    setSortMode,
    clearFilters,
  };
}
