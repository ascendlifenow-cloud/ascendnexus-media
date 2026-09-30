import type { ArtistPublicProfile } from "../../../src/models/artist";
import type { PublicGalleryItem } from "../../../src/models/gallery";
import type { PublicSongRelease } from "../../../src/models/release";

type StructuredDataObject = Record<string, unknown>;

const compact = (value: StructuredDataObject): StructuredDataObject =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ""));

const isSafeUrl = (url: unknown) =>
  typeof url !== "string" || (!url.includes("private/") && !url.includes("token=") && !url.includes("signed") && !url.startsWith("blob:"));

export class StructuredDataService {
  buildWebsiteSchema(site: { siteName: string; siteDescription?: string }, canonicalUrl: string) {
    return compact({ "@context": "https://schema.org", "@type": "WebSite", name: site.siteName, description: site.siteDescription, url: canonicalUrl });
  }

  buildOrganizationSchema(site: { siteName: string; defaultSocialImageUrl?: string }, canonicalUrl: string) {
    return compact({ "@context": "https://schema.org", "@type": "Organization", name: site.siteName, url: canonicalUrl, logo: site.defaultSocialImageUrl });
  }

  buildArtistSchema(artist: ArtistPublicProfile, canonicalUrl: string) {
    return compact({
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      name: artist.displayName ?? artist.name,
      url: canonicalUrl,
      image: artist.profileImage,
      description: artist.bio,
      genre: artist.genres?.length ? artist.genres : undefined,
      sameAs: artist.externalLinks ? Object.values(artist.externalLinks).filter((value) => typeof value === "string" && value.startsWith("https://")) : undefined,
    });
  }

  buildMusicRecordingSchema(release: PublicSongRelease, artist: ArtistPublicProfile | undefined, canonicalUrl: string) {
    return compact({
      "@context": "https://schema.org",
      "@type": "MusicRecording",
      name: release.title,
      url: canonicalUrl,
      image: release.coverArtUrl,
      description: release.featuredDescription,
      datePublished: release.releaseDate,
      genre: release.genre,
      byArtist: artist ? compact({ "@type": "MusicGroup", name: artist.displayName ?? artist.name, url: `${canonicalUrl.split("/songs/")[0]}/artists/${artist.slug}` }) : undefined,
      sameAs: release.externalLinks ? Object.values(release.externalLinks).filter((value) => typeof value === "string" && value.startsWith("https://")) : undefined,
    });
  }

  buildImageObjectSchema(item: PublicGalleryItem, canonicalUrl: string) {
    return compact({
      "@context": "https://schema.org",
      "@type": "ImageObject",
      name: item.title,
      url: canonicalUrl,
      contentUrl: item.imageUrl,
      thumbnailUrl: item.thumbnailUrl,
      description: item.description,
      caption: item.caption,
      creditText: item.credit,
    });
  }

  buildCollectionPageSchema(name: string, description: string, canonicalUrl: string) {
    return compact({ "@context": "https://schema.org", "@type": "CollectionPage", name, description, url: canonicalUrl });
  }

  sanitizeStructuredData(data: unknown): StructuredDataObject | StructuredDataObject[] | undefined {
    const sanitize = (item: unknown): StructuredDataObject | undefined => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
      const entries = Object.entries(item as StructuredDataObject)
        .filter(([, value]) => typeof value !== "function")
        .filter(([, value]) => isSafeUrl(value))
        .map(([key, value]) => [key, Array.isArray(value) ? value.filter(isSafeUrl) : value]);
      return compact(Object.fromEntries(entries));
    };
    if (Array.isArray(data)) return data.map(sanitize).filter(Boolean) as StructuredDataObject[];
    return sanitize(data);
  }
}

export const structuredDataService = new StructuredDataService();
