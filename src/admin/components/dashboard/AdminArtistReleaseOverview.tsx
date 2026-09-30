import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, FileMusic, Pencil, Search } from "lucide-react";
import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { LinkButton } from "../../../components/ui/LinkButton";
import { releaseRouteBuilder } from "../../services/ReleaseRouteBuilder";
import { AdminSectionCard } from "../AdminSectionCard";

interface AdminArtistReleaseOverviewProps {
  artists: ArtistAdminRecord[];
  releases: SongReleaseAdminRecord[];
}

const isPublishedRelease = (release: SongReleaseAdminRecord): boolean => release.status === "published";
const isInProgressRelease = (release: SongReleaseAdminRecord): boolean => !["published", "archived"].includes(release.status);

const formatDate = (value: string | undefined): string => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

function ReleaseMiniRow({ release }: { release: SongReleaseAdminRecord }) {
  const canOpenPublic = release.status === "published" && releaseRouteBuilder.canOpenPublicRelease(release);

  return (
    <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-white">{release.title || "Untitled release"}</p>
          <Badge variant={release.status === "published" ? "glass" : "neutral"} className="px-2 py-1 text-[0.68rem]">
            {release.status}
          </Badge>
          {release.featured ? (
            <Badge variant="sunrise" className="px-2 py-1 text-[0.68rem]">
              Featured
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-white/48">
          {release.slug || release.songId || release.releaseId} · {formatDate(release.releaseDate)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton to={releaseRouteBuilder.getAdminEditPath(release)} variant="glass" size="sm">
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </LinkButton>
        {canOpenPublic ? (
          <LinkButton to={releaseRouteBuilder.getPublicReleasePath(release)} variant="glass" size="sm">
            <ExternalLink className="h-4 w-4" aria-hidden />
            Public
          </LinkButton>
        ) : null}
      </div>
    </div>
  );
}

export function AdminArtistReleaseOverview({ artists, releases }: AdminArtistReleaseOverviewProps) {
  const activeArtists = useMemo(
    () => artists.filter((artist) => artist.status === "active").sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [artists],
  );
  const [expandedArtistIds, setExpandedArtistIds] = useState<Set<string>>(() => new Set(activeArtists.slice(0, 4).map((artist) => artist.artistId)));
  const [query, setQuery] = useState("");
  const [showOnlyInProgress, setShowOnlyInProgress] = useState(false);

  useEffect(() => {
    setExpandedArtistIds((current) => {
      if (current.size || !activeArtists.length) return current;
      return new Set(activeArtists.slice(0, 4).map((artist) => artist.artistId));
    });
  }, [activeArtists]);

  const releasesByArtist = useMemo(() => {
    return releases.reduce<Record<string, SongReleaseAdminRecord[]>>((groups, release) => {
      groups[release.artistId] = [...(groups[release.artistId] ?? []), release];
      return groups;
    }, {});
  }, [releases]);

  const visibleArtists = activeArtists.filter((artist) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    const artistMatches = [artist.displayName, artist.name, artist.slug].some((value) => value.toLowerCase().includes(normalizedQuery));
    const releaseMatches = (releasesByArtist[artist.artistId] ?? []).some((release) =>
      [release.title, release.slug, release.songId].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
    return artistMatches || releaseMatches;
  });

  const toggleArtist = (artistId: string) => {
    setExpandedArtistIds((current) => {
      const next = new Set(current);
      if (next.has(artistId)) next.delete(artistId);
      else next.add(artistId);
      return next;
    });
  };

  return (
    <AdminSectionCard
      title="Artist Release Overview"
      description="Active roster grouped by published and in-progress release work."
    >
      <div className="grid gap-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter artists or releases"
              className="min-h-11 w-full rounded-md border border-white/10 bg-black/24 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-anm-electric/50 focus:ring-2 focus:ring-anm-electric/25"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-white/72">
            <input type="checkbox" checked={showOnlyInProgress} onChange={(event) => setShowOnlyInProgress(event.target.checked)} />
            In-progress only
          </label>
        </div>

        <div className="grid gap-3">
          {visibleArtists.map((artist) => {
            const artistReleases = (releasesByArtist[artist.artistId] ?? []).sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate));
            const published = artistReleases.filter(isPublishedRelease);
            const inProgress = artistReleases.filter(isInProgressRelease);
            const isExpanded = expandedArtistIds.has(artist.artistId);
            const sections = showOnlyInProgress
              ? [{ label: "In Progress", items: inProgress }]
              : [
                  { label: "Published Songs", items: published },
                  { label: "In Progress Songs", items: inProgress },
                ];

            return (
              <section key={artist.artistId} className="rounded-md border border-white/10 bg-black/18">
                <button
                  type="button"
                  onClick={() => toggleArtist(artist.artistId)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035] focus:outline-none focus:ring-2 focus:ring-anm-electric/35"
                  aria-expanded={isExpanded}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{artist.displayName}</span>
                    <span className="mt-1 flex flex-wrap gap-2 text-xs text-white/48">
                      <span>{published.length} published</span>
                      <span>{inProgress.length} in progress</span>
                    </span>
                  </span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-white/52 transition ${isExpanded ? "rotate-180" : ""}`} aria-hidden />
                </button>

                {isExpanded ? (
                  <div className="grid gap-4 border-t border-white/10 p-4">
                    {sections.map((section) => (
                      <div key={section.label} className="grid gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/48">
                          <FileMusic className="h-4 w-4 text-anm-electric" aria-hidden />
                          {section.label}
                        </div>
                        {section.items.length ? (
                          <div className="grid gap-2">
                            {section.items.map((release) => <ReleaseMiniRow key={release.releaseId} release={release} />)}
                          </div>
                        ) : (
                          <p className="rounded-md border border-dashed border-white/10 px-3 py-3 text-sm text-white/45">No releases in this section.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
          {!visibleArtists.length ? (
            <p className="rounded-md border border-dashed border-white/12 px-4 py-5 text-sm text-white/52">No active roster artists match the current filter.</p>
          ) : null}
        </div>
      </div>
    </AdminSectionCard>
  );
}
