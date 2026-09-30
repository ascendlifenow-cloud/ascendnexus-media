import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";
import { publicSitemapService } from "../seo/PublicSitemapService";

export class ProductionConsistencyVerificationService {
  async buildConsistencyReport() {
    const [artists, releases, gallery, sitemap] = await Promise.all([
      publicContentDeliveryService.listPublicArtists(),
      publicContentDeliveryService.listPublicReleases(),
      publicContentDeliveryService.listPublicGalleryItems(),
      publicSitemapService.verifySitemaps(),
    ]);
    const errors: string[] = [];
    const releaseArtistIds = new Set(artists.map((artist) => artist.artistId));
    for (const release of releases) if (!releaseArtistIds.has(release.artistId)) errors.push(`Release ${release.releaseId} has no public artist.`);
    if (sitemap.status !== "passed") errors.push(...sitemap.blockingIssues);
    return { status: errors.length ? "failed" : "healthy", artists: artists.length, releases: releases.length, galleryItems: gallery.length, sitemapUrls: sitemap.urlCount, errors, checkedAt: new Date().toISOString() };
  }
}

export const productionConsistencyVerificationService = new ProductionConsistencyVerificationService();
