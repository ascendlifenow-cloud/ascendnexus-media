import type { MediaAssetRecord } from "../../models/admin";
import type {
  CdnAssetUrl,
  CdnDeliveryStatus,
  CdnInvalidationRequest,
  CdnUrlOptions,
  ImageDerivative,
  ImageDerivativeType,
  MediaCdnConfig,
  ResponsiveImageSource,
} from "../../models/media";
import { defaultCdnUrlOptions } from "../../models/media";
import { applyCdnCacheBust } from "../../utils/media/cacheBustUtils";
import {
  buildCdnPathList,
  defaultMediaCdnConfig,
  normalizePublicMediaUrl,
  transformToCdnUrl,
} from "../../utils/media/cdnUrlUtils";
import {
  buildResponsiveImageSources,
  getImageDerivativesFromAsset,
  getPreferredDerivativeTypes,
  selectImageDerivative,
} from "../../utils/media/responsiveImageUtils";
import { getMediaCategoryFromAssetType } from "../../utils/media/mediaTypeUtils";
import { mediaAssetVisibilityService } from "./MediaAssetVisibilityService";

const nowIso = (): string => new Date().toISOString();
const createInvalidationId = (): string => `cdn-invalidation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export class MediaCdnService {
  private readonly invalidations = new Map<string, CdnInvalidationRequest>();

  constructor(private readonly config: MediaCdnConfig = defaultMediaCdnConfig) {}

  getCdnConfig(): MediaCdnConfig {
    return this.config;
  }

  isCdnEnabled(): boolean {
    return Boolean(this.config.enabled && this.config.provider !== "none" && (this.config.baseUrl || this.config.imageBaseUrl || this.config.audioBaseUrl));
  }

  buildCdnUrl(asset: MediaAssetRecord | null | undefined, options: Partial<CdnUrlOptions> = {}): CdnAssetUrl | undefined {
    if (!asset) return undefined;
    const mediaCategory = options.mediaCategory ?? getMediaCategoryFromAssetType(asset.assetType);
    if (mediaCategory === "audio") return this.buildAudioCdnUrl(asset, options);
    return this.buildImageCdnUrl(asset, options);
  }

  buildImageCdnUrl(asset: MediaAssetRecord | null | undefined, options: Partial<CdnUrlOptions> = {}): CdnAssetUrl | undefined {
    if (!asset) return this.getFallbackAssetUrl("custom_image", options);
    const resolvedOptions = { ...defaultCdnUrlOptions, ...options };
    const visibility = mediaAssetVisibilityService.getAssetVisibility(asset, { requireAssignment: false });
    if (!visibility.publicAllowed && asset.status !== "published") return resolvedOptions.fallbackAllowed ? this.getFallbackAssetUrl(asset.assetType, resolvedOptions) : undefined;
    const derivatives = getImageDerivativesFromAsset(asset);
    const preferredTypes = getPreferredDerivativeTypes(resolvedOptions.derivativeType);
    const selected = resolvedOptions.preferDerivative
      ? selectImageDerivative(derivatives, preferredTypes, asset.largeUrl ?? asset.thumbnailUrl ?? asset.url)
      : undefined;
    const originalUrl = selected?.url ?? asset.largeUrl ?? asset.thumbnailUrl ?? asset.url;
    return this.buildAssetUrlFromOriginal(asset, originalUrl, resolvedOptions, selected);
  }

  buildAudioCdnUrl(asset: MediaAssetRecord | null | undefined, options: Partial<CdnUrlOptions> = {}): CdnAssetUrl | undefined {
    if (!asset) return undefined;
    const resolvedOptions = { ...defaultCdnUrlOptions, ...options, mediaCategory: "audio" as const };
    if (asset.assetType === "full_song" && !resolvedOptions.publicPlaybackAllowed) return undefined;
    if (!["audio_preview", "custom_audio", "full_song"].includes(asset.assetType)) return undefined;
    const visibility = mediaAssetVisibilityService.getAssetVisibility(asset, { requireAssignment: false, publicPlaybackAllowed: resolvedOptions.publicPlaybackAllowed });
    if (!visibility.publicAllowed && asset.status !== "published") return undefined;
    const streamable = this.getProcessedAudioUrl(asset) ?? asset.url;
    return this.buildAssetUrlFromOriginal(asset, streamable, resolvedOptions);
  }

  getBestPublicImageUrl(asset: MediaAssetRecord | null | undefined, options: Partial<CdnUrlOptions> = {}): string | undefined {
    return this.buildImageCdnUrl(asset, options)?.publicUrl;
  }

  getBestPublicAudioUrl(asset: MediaAssetRecord | null | undefined, options: Partial<CdnUrlOptions> = {}): string | undefined {
    return this.buildAudioCdnUrl(asset, options)?.publicUrl;
  }

  getResponsiveImageSources(asset: MediaAssetRecord | null | undefined, options: Partial<CdnUrlOptions> = {}): ResponsiveImageSource[] {
    if (!asset || !this.config.responsiveImagesEnabled) return [];
    const derivativeTypes: ImageDerivativeType[] = options.derivativeType
      ? getPreferredDerivativeTypes(options.derivativeType)
      : ["thumbnail", "card", "feature", "hero", "banner", "social"];
    return buildResponsiveImageSources(asset, derivativeTypes, (url, derivative, derivativeOptions) =>
      this.buildAssetUrlFromOriginal(asset, url, { ...defaultCdnUrlOptions, ...options, ...derivativeOptions }, derivative)?.publicUrl,
    );
  }

  applyCacheBust(url: string, asset: MediaAssetRecord): { url: string; cacheKey?: string } {
    return applyCdnCacheBust(url, asset, this.config.cacheBustStrategy);
  }

  getFallbackUrl(assetType: string, options: Partial<CdnUrlOptions> = {}): string | undefined {
    return this.getFallbackAssetUrl(assetType, options)?.publicUrl;
  }

  checkCdnDelivery(asset: MediaAssetRecord | null | undefined): CdnDeliveryStatus {
    if (!asset) {
      return { assetId: "missing", url: "", status: "missing", provider: this.config.provider, checkedAt: nowIso(), message: "Asset is missing." };
    }
    const url = this.buildCdnUrl(asset, { fallbackAllowed: true })?.publicUrl ?? "";
    if (!this.isCdnEnabled()) {
      return { assetId: asset.assetId, url, status: "not_configured", provider: this.config.provider, checkedAt: nowIso(), message: "CDN is not configured." };
    }
    if (!url) return { assetId: asset.assetId, url: "", status: "missing", provider: this.config.provider, checkedAt: nowIso(), message: "No public media URL is available." };
    const cdnUsed = this.isCdnUrl(url);
    return {
      assetId: asset.assetId,
      url,
      status: cdnUsed ? "ready" : "fallback_used",
      provider: this.config.provider,
      checkedAt: nowIso(),
      message: cdnUsed ? "CDN URL is ready." : "Public-safe fallback URL is in use.",
    };
  }

  prepareInvalidation(asset: MediaAssetRecord): CdnInvalidationRequest {
    const request: CdnInvalidationRequest = {
      requestId: createInvalidationId(),
      assetId: asset.assetId,
      paths: buildCdnPathList(asset),
      provider: this.config.provider,
      status: this.isCdnEnabled() ? "pending" : "skipped",
      requestedAt: nowIso(),
      completedAt: this.isCdnEnabled() ? undefined : nowIso(),
      metadata: {
        reason: this.isCdnEnabled() ? "ready_for_provider_submission" : "cdn_not_configured",
      },
    };
    this.invalidations.set(request.requestId, request);
    return request;
  }

  createInvalidationRequest(asset: MediaAssetRecord): CdnInvalidationRequest {
    return this.prepareInvalidation(asset);
  }

  submitInvalidation(request: CdnInvalidationRequest): CdnInvalidationRequest {
    const updated: CdnInvalidationRequest = this.isCdnEnabled()
      ? { ...request, status: "skipped", completedAt: nowIso(), metadata: { ...(request.metadata ?? {}), providerApi: "not_configured" } }
      : { ...request, status: "skipped", completedAt: nowIso(), metadata: { ...(request.metadata ?? {}), providerApi: "not_configured" } };
    this.invalidations.set(updated.requestId, updated);
    return updated;
  }

  getInvalidationStatus(requestId: string): CdnInvalidationRequest | null {
    return this.invalidations.get(requestId) ?? null;
  }

  normalizePublicMediaUrl(url: string | null | undefined): string | undefined {
    return normalizePublicMediaUrl(url);
  }

  private buildAssetUrlFromOriginal(
    asset: MediaAssetRecord,
    originalUrl: string | null | undefined,
    options: Partial<CdnUrlOptions>,
    derivative?: ImageDerivative,
  ): CdnAssetUrl | undefined {
    const safeOriginal = normalizePublicMediaUrl(originalUrl);
    if (!safeOriginal) return options.fallbackAllowed ? this.getFallbackAssetUrl(asset.assetType, options) : undefined;
    const transformed = transformToCdnUrl(safeOriginal, asset, this.config);
    const cacheApplied = options.cacheBust === false || !transformed
      ? { url: transformed ?? safeOriginal }
      : this.applyCacheBust(transformed, asset);
    return {
      originalUrl: safeOriginal,
      cdnUrl: this.isCdnUrl(cacheApplied.url) ? cacheApplied.url : undefined,
      publicUrl: cacheApplied.url,
      assetId: asset.assetId,
      versionId: typeof asset.metadata?.activeVersionId === "string" ? asset.metadata.activeVersionId : undefined,
      derivativeType: derivative?.type ?? options.derivativeType,
      width: derivative?.width ?? options.width,
      height: derivative?.height ?? options.height,
      format: derivative?.format ?? options.format,
      quality: derivative?.quality ?? options.quality,
      cacheKey: cacheApplied.cacheKey,
      fallbackUrl: this.getFallbackUrl(asset.assetType, { ...options, fallbackAllowed: false }),
      metadata: {
        cdnEnabled: this.isCdnEnabled(),
        provider: this.config.provider,
      },
    };
  }

  private getFallbackAssetUrl(assetType: string, options: Partial<CdnUrlOptions>): CdnAssetUrl | undefined {
    if (options.fallbackAllowed === false) return undefined;
    const fallbackBase = this.config.fallbackBaseUrl;
    const path = assetType.includes("artist") ? "/assets/fallbacks/ascend-nexus-artist-fallback.png" : "/assets/fallbacks/ascend-nexus-cover-fallback.png";
    const fallbackUrl = fallbackBase ? `${fallbackBase.replace(/\/+$/, "")}${path}` : path;
    const safe = normalizePublicMediaUrl(fallbackUrl);
    return safe ? { originalUrl: safe, publicUrl: safe, fallbackUrl: safe, metadata: { fallbackUsed: true } } : undefined;
  }

  private getProcessedAudioUrl(asset: MediaAssetRecord): string | undefined {
    const audio = asset.metadata?.audio;
    if (!audio || typeof audio !== "object" || Array.isArray(audio)) return undefined;
    const preview = audio.previewUrl ?? audio.streamablePreviewUrl;
    return typeof preview === "string" ? preview : undefined;
  }

  private isCdnUrl(url: string): boolean {
    const bases = [this.config.baseUrl, this.config.imageBaseUrl, this.config.audioBaseUrl].filter(Boolean) as string[];
    return bases.some((base) => url.startsWith(base.replace(/\/+$/, "")));
  }
}

export const mediaCdnService = new MediaCdnService();
