import { AlertTriangle, CloudUpload, FileMusic, Images, LayoutDashboard, Search, Sparkles, UsersRound } from "lucide-react";
import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import {
  useAdminArtists,
  useAdminMediaAssets,
  useAdminReleases,
  useAdminSiteConfig,
} from "../../hooks/admin/useAdminContent";
import { AdminActionButton, AdminPageHeader, AdminSectionCard } from "../components";
import { AdminArtistReleaseOverview } from "../components/dashboard/AdminArtistReleaseOverview";
import {
  getArtistAdminStats,
  getHomepageAdminStats,
  getMediaAdminStats,
  getMissingMetadataCount,
  getReleaseAdminStats,
} from "../utils/adminStats";

export function AdminDashboardPage() {
  const artistsQuery = useAdminArtists();
  const releasesQuery = useAdminReleases();
  const mediaQuery = useAdminMediaAssets();
  const siteConfigQuery = useAdminSiteConfig();

  const isLoading = artistsQuery.isLoading || releasesQuery.isLoading || mediaQuery.isLoading || siteConfigQuery.isLoading;
  const isError =
    artistsQuery.isError ||
    releasesQuery.isError ||
    mediaQuery.isError ||
    siteConfigQuery.isError ||
    artistsQuery.data?.ok === false ||
    releasesQuery.data?.ok === false ||
    mediaQuery.data?.ok === false ||
    siteConfigQuery.data?.ok === false;

  const artists = artistsQuery.data?.ok ? artistsQuery.data.data : [];
  const releases = releasesQuery.data?.ok ? releasesQuery.data.data : [];
  const mediaAssets = mediaQuery.data?.ok ? mediaQuery.data.data : [];
  const siteConfig = siteConfigQuery.data?.ok ? siteConfigQuery.data.data : undefined;

  const artistStats = getArtistAdminStats(artists);
  const releaseStats = getReleaseAdminStats(releases);
  const mediaStats = getMediaAdminStats(mediaAssets);
  const homepageStats = getHomepageAdminStats(siteConfig);
  const missingMetadata = getMissingMetadataCount(artists, releases);
  const publicationActive = mediaAssets.filter((asset) => ["publishing", "pending_publication"].includes(String(asset.metadata?.publicationState ?? ""))).length;
  const publicationFailures = mediaAssets.filter((asset) => ["publish_failed", "blocked"].includes(String(asset.metadata?.publicationState ?? ""))).length;
  const pendingPromotion = mediaAssets.filter((asset) => asset.status === "draft" && asset.metadata?.storage && asset.assetType !== "full_song").length;
  const summaryItems = [
    { label: "Active Artists", value: artistStats.active, icon: UsersRound },
    { label: "Published Releases", value: releaseStats.published, icon: FileMusic },
    { label: "Draft Releases", value: releaseStats.draft, icon: LayoutDashboard },
    { label: "Archived Releases", value: releaseStats.archived, icon: FileMusic },
    { label: "Media Assets", value: mediaStats.total, icon: Images },
    { label: "Featured Releases", value: releaseStats.featured, icon: Sparkles },
    { label: `Homepage Sections (${homepageStats.disabledSections} disabled)`, value: homepageStats.enabledSections, icon: LayoutDashboard },
    { label: "Missing Metadata", value: missingMetadata, icon: Search },
    { label: "Publishing Active", value: publicationActive, icon: CloudUpload },
    { label: "Publication Failures", value: publicationFailures, icon: AlertTriangle },
    { label: "Pending Promotion", value: pendingPromotion, icon: CloudUpload },
  ];

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Overview"
        title="Admin Dashboard"
        description="Monitor public content readiness and prepare future publishing workflows for Ascend Nexus Media."
        status="mock"
      />

      {isLoading ? <GridSkeleton itemCount={8} variant="block" columns="sm:grid-cols-2 xl:grid-cols-4" /> : null}
      {isError ? <PublicLoadingErrorState /> : null}

      {!isLoading && !isError ? (
        <>
          <section
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/18 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
            aria-label="Admin dashboard summary and actions"
          >
            <div className="flex flex-wrap items-center gap-2" aria-label="Admin content summary">
              {summaryItems.map(({ label, value, icon: Icon }) => (
                <span
                  key={label}
                  title={label}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-white/82 shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
                >
                  <Icon className="h-4 w-4 text-anm-gold" aria-hidden />
                  <span aria-hidden>{value}</span>
                  <span className="sr-only">{label}: {value}</span>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminActionButton to="/">View Public Site</AdminActionButton>
            </div>
          </section>

          <AdminArtistReleaseOverview artists={artists} releases={releases} />

          <AdminSectionCard title="Content Status Overview" description="Mock-backed services are connected and ready to be replaced by API endpoints.">
            <div className="grid gap-3 text-sm text-white/66 md:grid-cols-3">
              <p>Total artists: <span className="font-semibold text-white">{artistStats.total}</span></p>
              <p>Total releases: <span className="font-semibold text-white">{releaseStats.total}</span></p>
              <p>Published media: <span className="font-semibold text-white">{mediaStats.published}</span></p>
            </div>
          </AdminSectionCard>
        </>
      ) : null}
    </div>
  );
}
