import { useEffect, useMemo, useState } from "react";
import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import type {
  MediaAssignmentReviewItem,
  MediaAssetLinkEntityType,
  MediaAssetLinkFieldKey,
  MediaAssetLinkIntendedUse,
} from "../../../models/media";
import type { MediaReviewAssignmentDraft } from "../../services/mediaReview/mediaReviewTypes";
import { buildReviewAssignmentPayload } from "../../../utils/media/mediaAssignmentReviewUtils";
import { mediaAssetLinkingService } from "../../../services/media/MediaAssetLinkingService";

interface MediaAssignmentActionPanelProps {
  item: MediaAssignmentReviewItem | null;
  artists: readonly ArtistAdminRecord[];
  releases: readonly SongReleaseAdminRecord[];
  onAssign: (reviewItemId: string, assignment: {
    entityType: MediaAssetLinkEntityType;
    entityId: string;
    fieldKey: MediaAssetLinkFieldKey;
    intendedUse: MediaAssetLinkIntendedUse;
    replaceExisting: boolean;
  }) => void;
  onKeepUnassigned: (reviewItemId: string) => void;
  onArchive: (reviewItemId: string) => void;
  showFooterActions?: boolean;
  onDraftChange?: (draft: MediaReviewAssignmentDraft) => void;
}

const entityTypes: MediaAssetLinkEntityType[] = ["artist", "release", "gallery_item", "homepage_section", "seo_metadata", "social_metadata", "site_config", "custom"];
const fieldKeys: MediaAssetLinkFieldKey[] = ["profileImage", "profileThumbnailUrl", "profileBannerUrl", "characterArtUrl", "coverArtUrl", "audioPreviewUrl", "fullSongUrl", "imageUrl", "thumbnailUrl", "heroImageUrl", "socialImageUrl", "brandLogoUrl", "defaultCoverArtUrl", "defaultArtistImageUrl", "defaultSocialImageUrl", "custom"];
const intendedUses: MediaAssetLinkIntendedUse[] = ["artist_profile_image", "artist_character_art", "artist_banner", "release_cover_art", "release_audio_preview", "release_full_song", "gallery_image", "homepage_hero", "seo_image", "social_preview_image", "site_logo", "site_fallback_image", "custom"];
const inputClass = "min-h-10 rounded-md border border-white/12 bg-black/24 px-3 text-sm font-semibold text-white outline-none focus:border-anm-pink focus:ring-2 focus:ring-anm-pink/20";

const normalizeMatchText = (value: string | null | undefined): string =>
  (value ?? "").toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, "");

const readableLabel = (value: string): string => value.replace(/_/g, " ");

const createRouteForEntityType = (entityType: MediaAssetLinkEntityType, item: MediaAssignmentReviewItem): string | null => {
  const params = new URLSearchParams({
    sourceMediaAssetId: item.assetId,
    sourceMediaReviewItemId: item.reviewItemId,
  });
  if (entityType === "artist") return `/admin/artists/new?${params.toString()}`;
  if (entityType === "release") return `/admin/releases/new?${params.toString()}`;
  return null;
};

const getAssetMatchText = (item: MediaAssignmentReviewItem): string => normalizeMatchText([
  item.asset.title,
  typeof item.asset.metadata?.originalFileName === "string" ? item.asset.metadata.originalFileName : "",
  item.asset.assetType,
].join(" "));

const scoreArtistMatch = (item: MediaAssignmentReviewItem, artist: ArtistAdminRecord): number => {
  const source = getAssetMatchText(item);
  const values = [artist.displayName, artist.name, artist.slug, artist.artistId].map(normalizeMatchText).filter(Boolean);
  return values.reduce((score, value) => Math.max(score, source.includes(value) ? value.length : 0), 0);
};

const scoreReleaseMatch = (
  item: MediaAssignmentReviewItem,
  release: SongReleaseAdminRecord,
  artists: readonly ArtistAdminRecord[],
): number => {
  const source = getAssetMatchText(item);
  const artist = artists.find((candidate) => candidate.artistId === release.artistId);
  const titleValues = [release.title, release.slug, release.songId, release.releaseId].map(normalizeMatchText).filter(Boolean);
  const artistValues = [artist?.displayName, artist?.name, artist?.slug].map(normalizeMatchText).filter(Boolean);
  const titleScore = titleValues.reduce((score, value) => Math.max(score, source.includes(value) ? value.length : 0), 0);
  const artistScore = artistValues.reduce((score, value) => Math.max(score, source.includes(value) ? Math.min(value.length, 10) : 0), 0);
  return titleScore + artistScore;
};

export function MediaAssignmentActionPanel({
  item,
  artists,
  releases,
  onAssign,
  onKeepUnassigned,
  onArchive,
  showFooterActions = true,
  onDraftChange,
}: MediaAssignmentActionPanelProps) {
  const [entityType, setEntityType] = useState<MediaAssetLinkEntityType>("custom");
  const [entityId, setEntityId] = useState("");
  const [fieldKey, setFieldKey] = useState<MediaAssetLinkFieldKey>("custom");
  const [intendedUse, setIntendedUse] = useState<MediaAssetLinkIntendedUse>("custom");
  const [replaceExisting, setReplaceExisting] = useState(true);

  useEffect(() => {
    if (!item) return;
    const payload = buildReviewAssignmentPayload(item);
    const bestRelease = releases
      .map((release) => ({ release, score: scoreReleaseMatch(item, release, artists) }))
      .sort((a, b) => b.score - a.score)[0];
    const bestArtist = artists
      .map((artist) => ({ artist, score: scoreArtistMatch(item, artist) }))
      .sort((a, b) => b.score - a.score)[0];
    const resolvedEntityId = payload.entityType === "release" && bestRelease?.score > 3
      ? bestRelease.release.releaseId
      : payload.entityType === "artist" && bestArtist?.score > 3
        ? bestArtist.artist.artistId
        : payload.entityId;
    setEntityType(payload.entityType);
    setEntityId(resolvedEntityId);
    setFieldKey(payload.fieldKey);
    setIntendedUse(payload.intendedUse);
    setReplaceExisting(payload.replaceExisting);
  }, [artists, item, releases]);

  const entityOptions = useMemo(() => {
    if (entityType === "artist") {
      return artists.map((artist) => ({
        id: artist.artistId,
        label: `${artist.displayName || artist.name} (${artist.status})`,
      }));
    }
    if (entityType === "release") {
      return releases.map((release) => {
        const artist = artists.find((candidate) => candidate.artistId === release.artistId);
        return {
          id: release.releaseId,
          label: `${release.title}${artist ? ` - ${artist.displayName || artist.name}` : ""} (${release.status})`,
        };
      });
    }
    return [];
  }, [artists, entityType, releases]);

  const bestMatch = useMemo(() => {
    if (!item) return null;
    if (entityType === "artist") {
      const candidate = artists
        .map((artist) => ({ entityId: artist.artistId, label: artist.displayName || artist.name, score: scoreArtistMatch(item, artist) }))
        .sort((a, b) => b.score - a.score)[0];
      return candidate && candidate.score > 3 ? candidate : null;
    }
    if (entityType === "release") {
      const candidate = releases
        .map((release) => {
          const artist = artists.find((itemArtist) => itemArtist.artistId === release.artistId);
          return {
            entityId: release.releaseId,
            label: `${release.title}${artist ? ` - ${artist.displayName || artist.name}` : ""}`,
            score: scoreReleaseMatch(item, release, artists),
          };
        })
        .sort((a, b) => b.score - a.score)[0];
      return candidate && candidate.score > 3 ? candidate : null;
    }
    return null;
  }, [artists, entityType, item, releases]);

  const compatibility = useMemo(() => {
    if (!item) return null;
    return mediaAssetLinkingService.validateAssetCompatibility(item.asset, entityType, fieldKey, intendedUse);
  }, [entityType, fieldKey, intendedUse, item]);

  useEffect(() => {
    if (!item || !onDraftChange) return;
    onDraftChange({
      entityType,
      entityId,
      fieldKey,
      intendedUse,
      replaceExisting,
      compatible: compatibility?.compatible ?? false,
      blockingIssues: compatibility?.blockingIssues ?? [],
    });
  }, [compatibility, entityId, entityType, fieldKey, intendedUse, item, onDraftChange, replaceExisting]);

  if (!item) {
    return (
      <div className="rounded-md border border-white/10 bg-black/18 p-4 text-sm text-white/58">
        Select a review item to assign or resolve it.
      </div>
    );
  }

  const canAssign = entityId.trim().length > 0 && (compatibility?.compatible ?? false);
  const createRoute = createRouteForEntityType(entityType, item);
  const showCreatePrompt = Boolean(createRoute && !bestMatch && !entityId.trim());

  return (
    <section className="grid gap-4 rounded-md border border-white/10 bg-black/18 p-4" aria-label="Assignment action panel">
      <div>
        <h3 className="text-base font-semibold text-white">Assignment Actions</h3>
        <p className="mt-1 text-sm text-white/58">Assignment creates a media link and keeps publishing controlled by the existing workflow.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/44">Entity Type</span>
          <select className={inputClass} value={entityType} onChange={(event) => setEntityType(event.target.value as MediaAssetLinkEntityType)}>
            {entityTypes.map((type) => <option key={type} value={type}>{readableLabel(type)}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/44">{entityOptions.length ? "Target" : "Entity ID"}</span>
          {entityOptions.length ? (
            <select className={inputClass} value={entityId} onChange={(event) => setEntityId(event.target.value)}>
              <option value="">Select {readableLabel(entityType)}</option>
              {entityOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          ) : (
            <input className={inputClass} value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="artist ID, release ID, or custom entity" />
          )}
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/44">Field Key</span>
          <select className={inputClass} value={fieldKey} onChange={(event) => setFieldKey(event.target.value as MediaAssetLinkFieldKey)}>
            {fieldKeys.map((field) => <option key={field} value={field}>{field}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/44">Intended Use</span>
          <select className={inputClass} value={intendedUse} onChange={(event) => setIntendedUse(event.target.value as MediaAssetLinkIntendedUse)}>
            {intendedUses.map((use) => <option key={use} value={use}>{use.replace(/_/g, " ")}</option>)}
          </select>
        </label>
      </div>
      {bestMatch ? (
        <div className="rounded-md border border-anm-gold/30 bg-anm-gold/10 p-3 text-sm text-white/76">
          <p className="font-semibold text-white">Best match: {bestMatch.label}</p>
          <p className="mt-1 text-white/58">Matched from the uploaded filename, title, and selected entity type.</p>
          <button
            type="button"
            className="mt-3 min-h-9 rounded-md border border-anm-gold/40 px-3 text-xs font-bold uppercase tracking-[0.12em] text-anm-gold"
            onClick={() => setEntityId(bestMatch.entityId)}
          >
            Use Best Match
          </button>
        </div>
      ) : null}
      {showCreatePrompt && createRoute ? (
        <div className="rounded-md border border-anm-pink/30 bg-anm-pink/10 p-3 text-sm text-white/76">
          <p className="font-semibold text-white">No matching {readableLabel(entityType)} was found.</p>
          <p className="mt-1 text-white/58">Create the missing {readableLabel(entityType)} first, then return here and assign this media asset.</p>
          <button
            type="button"
            className="mt-3 min-h-9 rounded-md border border-anm-pink/40 px-3 text-xs font-bold uppercase tracking-[0.12em] text-anm-pink"
            onClick={() => {
              if (window.confirm(`Create a new ${readableLabel(entityType)} for this media asset?`)) {
                window.location.assign(createRoute);
              }
            }}
          >
            Create {readableLabel(entityType)}
          </button>
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm font-semibold text-white">
        <input type="checkbox" checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} />
        Replace existing asset on this entity field
      </label>
      {compatibility?.blockingIssues.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-anm-pink">
          {compatibility.blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      ) : null}
      {compatibility?.warnings.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-anm-gold">
          {compatibility.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      ) : null}
      {showFooterActions ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-h-10 rounded-md border border-white/12 px-4 text-sm font-semibold text-white disabled:opacity-40" disabled={!canAssign} onClick={() => onAssign(item.reviewItemId, { entityType, entityId, fieldKey, intendedUse, replaceExisting })}>Assign Asset</button>
          <button type="button" className="min-h-10 rounded-md border border-white/12 px-4 text-sm font-semibold text-white" onClick={() => onKeepUnassigned(item.reviewItemId)}>Keep Unassigned</button>
          <button type="button" className="min-h-10 rounded-md border border-white/12 px-4 text-sm font-semibold text-white" onClick={() => onArchive(item.reviewItemId)}>Archive Asset</button>
        </div>
      ) : null}
    </section>
  );
}
