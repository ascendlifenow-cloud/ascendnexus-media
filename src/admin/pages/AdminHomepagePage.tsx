import { useMemo, useState } from "react";
import { Eye, Plus, Save } from "lucide-react";
import { LinkButton } from "../../components/ui/LinkButton";
import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { Button } from "../../components/ui/Button";
import {
  AdminHomepageActions,
  AdminHomepageEmptyState,
  AdminHomepageSectionList,
  AdminHomepageSectionPreview,
  AdminHomepageStats,
  AdminHomepageToolbar,
} from "../components/homepage";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { useAdminHomepageConfig } from "../hooks/useAdminHomepageConfig";
import { useAdminHomepageFilters } from "../hooks/useAdminHomepageFilters";
import { useSelectedHomepageSection } from "../hooks/useSelectedHomepageSection";
import { usePublishAdminSiteConfig, useUpdateAdminSiteConfig } from "../../hooks/admin/useAdminContent";
import type { PublicSiteConfigSection } from "../../models/admin";

const adminHomepageMetadata = {
  title: "Admin Homepage | Ascend Nexus Media",
  description: "Manage Ascend Nexus Media homepage section configuration and public visibility.",
  type: "custom" as const,
  noIndex: true,
};

export function AdminHomepagePage() {
  const homepageQuery = useAdminHomepageConfig();
  const updateSiteConfig = useUpdateAdminSiteConfig();
  const publishSiteConfig = usePublishAdminSiteConfig();
  const { selectedSection, selectSection, clearSelectedSection } = useSelectedHomepageSection();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const {
    searchQuery,
    enabledFilter,
    sectionTypeFilter,
    sortMode,
    availableSectionTypes,
    filteredSections,
    hasFilters,
    setSearchQuery,
    setEnabledFilter,
    setSectionTypeFilter,
    setSortMode,
    clearFilters,
  } = useAdminHomepageFilters(homepageQuery.homepageSections);

  const hasServiceError = homepageQuery.isError || homepageQuery.data?.ok === false;
  const sortedSections = [...homepageQuery.homepageSections].sort((left, right) => left.sortOrder - right.sortOrder);
  const isSaving = updateSiteConfig.isPending || publishSiteConfig.isPending;
  const activeSection = useMemo(
    () => homepageQuery.homepageSections.find((section) => section.sectionId === activeSectionId) ?? null,
    [activeSectionId, homepageQuery.homepageSections],
  );
  const activeSectionIndex = activeSection ? sortedSections.findIndex((section) => section.sectionId === activeSection.sectionId) : -1;

  const persistSections = (sections: PublicSiteConfigSection[]) => {
    updateSiteConfig.mutate({ homepageSections: sections.map((section, index) => ({ ...section, sortOrder: (index + 1) * 10 })) });
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    const currentIndex = sortedSections.findIndex((section) => section.sectionId === sectionId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedSections.length) return;
    const nextSections = [...sortedSections];
    const [section] = nextSections.splice(currentIndex, 1);
    nextSections.splice(targetIndex, 0, section);
    persistSections(nextSections);
  };

  const toggleSection = (sectionId: string) => {
    persistSections(sortedSections.map((section) => (section.sectionId === sectionId ? { ...section, enabled: !section.enabled } : section)));
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={adminHomepageMetadata} disableSocial />
      <AdminPageHeader
        title="Homepage Management"
        description="Manage Ascend Nexus Media homepage sections, visibility, ordering, featured placements, content blocks, and public landing page configuration."
        status="ready"
      />

      {homepageQuery.isLoading ? <GridSkeleton itemCount={6} variant="block" columns="sm:grid-cols-2 xl:grid-cols-6" /> : null}
      {hasServiceError ? <PublicLoadingErrorState /> : null}

      {!homepageQuery.isLoading && !hasServiceError ? (
        <>
          <section
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/18 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
            aria-label="Homepage management summary and actions"
          >
            <AdminHomepageStats siteConfig={homepageQuery.siteConfig} />
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton to="/admin/preview/homepage" variant="glass">
                <Eye className="h-4 w-4" aria-hidden />
                Preview Homepage
              </LinkButton>
              <LinkButton to="/admin/homepage/sections/new" variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                Add Section
              </LinkButton>
              <Button type="button" variant="glass" disabled={isSaving || !homepageQuery.siteConfig} onClick={() => homepageQuery.siteConfig ? updateSiteConfig.mutate({ homepageSections: sortedSections }) : undefined}>
                <Save className="h-4 w-4" aria-hidden />
                Save Layout
              </Button>
              <Button type="button" variant="secondary" disabled={isSaving || !homepageQuery.siteConfig} onClick={() => publishSiteConfig.mutate()}>
                Publish
              </Button>
            </div>
          </section>

          <AdminHomepageToolbar
            searchQuery={searchQuery}
            enabledFilter={enabledFilter}
            sectionTypeFilter={sectionTypeFilter}
            sortMode={sortMode}
            sectionTypes={availableSectionTypes}
            resultCount={filteredSections.length}
            totalCount={homepageQuery.homepageSections.length}
            onSearchChange={setSearchQuery}
            onEnabledFilterChange={setEnabledFilter}
            onSectionTypeFilterChange={setSectionTypeFilter}
            onSortModeChange={setSortMode}
            onClearFilters={clearFilters}
          />

          {filteredSections.length > 0 ? (
            <AdminHomepageSectionList
              sections={filteredSections}
              selectedSectionId={activeSectionId}
              onSelectSection={(section) => setActiveSectionId(section.sectionId)}
              onOpenSection={(section) => {
                setActiveSectionId(section.sectionId);
                selectSection(section);
              }}
            />
          ) : (
            <AdminHomepageEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
          )}

          <AdminHomepageSectionPreview section={selectedSection} onClose={clearSelectedSection} />

          <AdminSectionCard title="Publication Status" description="Homepage section changes are saved as a draft and become public only after publish succeeds.">
            <div className="grid gap-3 text-sm text-white/64 md:grid-cols-3">
              <p>{homepageQuery.siteConfig?.metadata?.publicationState ?? "draft"} publication state</p>
              <p>{homepageQuery.homepageSections.filter((section) => section.enabled).length} enabled sections</p>
              <p>Current public order is refreshed after publication</p>
            </div>
          </AdminSectionCard>

          {activeSection ? (
            <aside
              className="fixed bottom-5 right-5 z-40 w-[min(46rem,calc(100vw-2.5rem))] rounded-md border border-anm-pink/25 bg-[#151019]/95 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.46)] backdrop-blur-xl"
              aria-label="Selected homepage section actions"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-anm-gold">Selected homepage section</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{activeSection.title || activeSection.sectionId}</p>
                  <p className="mt-1 truncate text-xs text-white/44">{activeSection.sectionId}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setActiveSectionId(null)}>
                  Clear
                </Button>
              </div>
              <AdminHomepageActions
                section={activeSection}
                onPreview={selectSection}
                onMoveUp={(sectionId) => moveSection(sectionId, -1)}
                onMoveDown={(sectionId) => moveSection(sectionId, 1)}
                onToggle={toggleSection}
                canMoveUp={activeSectionIndex > 0}
                canMoveDown={activeSectionIndex >= 0 && activeSectionIndex < sortedSections.length - 1}
                isSaving={isSaving}
              />
            </aside>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
