import type { PublishingPublicVisibility } from "./PublishingWorkflow";

export type ReleaseLinkedAssetKey = "coverArt" | "audioPreview" | "fullSong" | "seoImage" | "socialImage";

export interface ReleaseLinkedAssetReadinessState {
  key: ReleaseLinkedAssetKey;
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

export interface ReleaseArtistReadinessState {
  artistId?: string;
  exists: boolean;
  active: boolean;
  displayName?: string;
  blockingIssues: string[];
}

export interface ReleaseMetadataReadinessState {
  seoTitlePresent: boolean;
  seoDescriptionPresent: boolean;
  seoImageSafe: boolean;
  socialTitlePresent: boolean;
  socialDescriptionPresent: boolean;
  socialImageSafe: boolean;
  warnings: string[];
  blockingIssues: string[];
}

export interface ReleasePublishReadiness {
  releaseId: string;
  ready: boolean;
  publicVisibility: PublishingPublicVisibility;
  blockingIssues: string[];
  warnings: string[];
  missingFields: string[];
  linkedAssetStates: Record<ReleaseLinkedAssetKey, ReleaseLinkedAssetReadinessState>;
  artistState: ReleaseArtistReadinessState;
  metadataState: ReleaseMetadataReadinessState;
  checkedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

