import type { SeoMetadata } from "../../models/seo";
import type { SocialShareMetadata } from "../../models/social";
import { usePublicMetadata } from "../../hooks/public/usePublicMetadata";
import { SEOHead } from "../SEOHead";
import { StructuredDataHead } from "../StructuredDataHead";

interface PublicPageMetadataProps {
  path: string;
  fallbackMetadata: SeoMetadata;
  fallbackSocialMetadata?: SocialShareMetadata;
}

interface PublicMetadataResponse {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  noIndex: boolean;
  openGraph?: {
    title: string;
    description: string;
    type: SocialShareMetadata["type"];
    url: string;
    image?: string;
    imageAlt?: string;
    siteName?: string;
  };
  twitterCard?: {
    card: SocialShareMetadata["twitterCard"];
    title: string;
    description: string;
    image?: string;
    imageAlt?: string;
  };
  structuredData?: unknown;
}

export function PublicPageMetadata({ path, fallbackMetadata, fallbackSocialMetadata }: PublicPageMetadataProps) {
  const metadataQuery = usePublicMetadata(path);
  const publicMetadata = metadataQuery.data as PublicMetadataResponse | undefined;
  const seoMetadata: SeoMetadata = publicMetadata
    ? {
        title: publicMetadata.title,
        description: publicMetadata.description,
        canonicalPath: publicMetadata.canonicalUrl,
        imageUrl: publicMetadata.openGraph?.image,
        imageAlt: publicMetadata.openGraph?.imageAlt,
        noIndex: publicMetadata.noIndex,
        type: publicMetadata.openGraph?.type === "music.song" ? "song" : publicMetadata.openGraph?.type === "profile" ? "artist" : "website",
      }
    : fallbackMetadata;
  const socialMetadata: SocialShareMetadata | undefined = publicMetadata
    ? {
        title: publicMetadata.openGraph?.title ?? publicMetadata.title,
        description: publicMetadata.openGraph?.description ?? publicMetadata.description,
        imageUrl: publicMetadata.openGraph?.image ?? "",
        imageAlt: publicMetadata.openGraph?.imageAlt,
        url: publicMetadata.openGraph?.url ?? publicMetadata.canonicalUrl,
        type: publicMetadata.openGraph?.type,
        twitterCard: publicMetadata.twitterCard?.card,
        siteName: publicMetadata.openGraph?.siteName,
      }
    : fallbackSocialMetadata;

  return (
    <>
      <SEOHead metadata={seoMetadata} socialMetadata={socialMetadata} />
      <StructuredDataHead data={publicMetadata?.structuredData} />
    </>
  );
}
