import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import type { PublicGalleryItem } from "../../../models/gallery";
import { getGalleryItemPublicVisibilityState } from "../../utils/adminGalleryUtils";
import { PublicVisibilityBadge } from "../publishing";

interface AdminGalleryVisibilityStateProps {
  item: PublicGalleryItem;
  artists: readonly ArtistAdminRecord[];
  releases: readonly SongReleaseAdminRecord[];
}

export function AdminGalleryVisibilityState({ item, artists, releases }: AdminGalleryVisibilityStateProps) {
  const state = getGalleryItemPublicVisibilityState(item, artists, releases);

  return <PublicVisibilityBadge visibility={state === "public" ? "public" : "not_public"} />;
}
