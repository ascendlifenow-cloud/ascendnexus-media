export interface PublicMediaReference {
  url: string;
  thumbnailUrl?: string;
  largeUrl?: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  altText?: string;
  credit?: string;
  fallback?: boolean;
  version?: string;
}

export interface PublicAudioPreview {
  previewId?: string;
  releaseId?: string;
  url: string;
  mimeType?: string;
  durationSeconds?: number;
  waveformUrl?: string;
  waveformData?: number[];
  version?: string;
  fileSizeBytes?: number;
  bitrate?: number;
  codec?: string;
  fallback?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PublicExternalLink {
  platform?: string;
  label: string;
  url: string;
  enabled?: boolean;
  sortOrder?: number;
}

export interface PublicArtistSummary {
  artistId: string;
  displayName: string;
  slug: string;
  shortBio?: string;
  genres?: string[];
  styleTags?: string[];
  profileImage?: string | PublicMediaReference;
  featured?: boolean;
  releaseCount?: number;
}

export interface PublicArtistDetail extends PublicArtistSummary {
  bio?: string;
  banner?: string | PublicMediaReference;
  characterArt?: string | PublicMediaReference;
  externalLinks?: PublicExternalLink[] | Record<string, string>;
}

export interface PublicReleaseSummary {
  releaseId: string;
  songId?: string;
  title: string;
  slug: string;
  artist?: PublicArtistSummary;
  releaseDate: string;
  coverArt?: string | PublicMediaReference;
  audioPreview?: PublicAudioPreview | string;
  genre?: string;
  styleTags?: string[];
  featured?: boolean;
  featuredPlacement?: string;
}

export interface PublicReleaseDetail extends PublicReleaseSummary {
  description?: string;
  lyrics?: string;
  externalLinks?: PublicExternalLink[] | Record<string, string>;
}

export interface PublicGalleryItemSummary {
  galleryItemId?: string;
  title: string;
  slug: string;
  media?: PublicMediaReference;
  featured?: boolean;
  sortOrder?: number;
}

export interface PublicGalleryItemDetail extends PublicGalleryItemSummary {
  description?: string;
  caption?: string;
  credit?: string;
}

export interface PublicNavigationItem {
  label: string;
  url: string;
  type?: "internal" | "external" | "dropdown";
  enabled?: boolean;
  sortOrder?: number;
}

export interface PublicFooterConfiguration {
  brandText?: string;
  description?: string;
  navigationGroups?: Array<{ heading: string; links: PublicNavigationItem[] }>;
  socialLinks?: PublicExternalLink[];
  copyrightText?: string;
}

export interface PublicSeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export interface PublicSocialMetadata {
  openGraph: Record<string, unknown>;
  twitterCard: Record<string, unknown>;
}

export interface PublicPaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PublicApiEnvelope<T> {
  success: true;
  data: T;
  pagination?: PublicPaginationMetadata;
  meta?: Record<string, unknown>;
}

export interface PublicApiError {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId?: string;
  };
}
