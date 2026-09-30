import type { PublishingPublicVisibility } from "./PublishingWorkflow";

export type ArtistLinkedAssetKey =
  | "profileImage"
  | "characterArt"
  | "bannerImage"
  | "thumbnailImage"
  | "seoImage"
  | "socialImage";

export interface ArtistLinkedAssetReadinessState {
  key: ArtistLinkedAssetKey;
  label: string;
  assetId?: string;
  url?: string;
  present: boolean;
  required: boolean;
  publicAllowed: boolean;
  visibility: string;
  blockingIssues: string[];
  warnings: string[];
}

export interface ArtistMetadataReadinessState {
  seoTitlePresent: boolean;
  seoDescriptionPresent: boolean;
  seoImageSafe: boolean;
  socialTitlePresent: boolean;
  socialDescriptionPresent: boolean;
  socialImageSafe: boolean;
  warnings: string[];
  blockingIssues: string[];
}

export interface ArtistPublishReadiness {
  artistId: string;
  ready: boolean;
  publicVisibility: PublishingPublicVisibility;
  blockingIssues: string[];
  warnings: string[];
  missingFields: string[];
  linkedAssetStates: Record<ArtistLinkedAssetKey, ArtistLinkedAssetReadinessState>;
  metadataState: ArtistMetadataReadinessState;
  checkedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

