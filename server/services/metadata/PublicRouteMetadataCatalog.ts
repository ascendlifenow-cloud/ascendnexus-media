export type MetadataEntityType =
  | "site"
  | "homepage"
  | "artist_directory"
  | "artist"
  | "release_directory"
  | "release"
  | "gallery"
  | "gallery_item"
  | "search"
  | "browse"
  | "about"
  | "contact"
  | "privacy"
  | "terms"
  | "not_found"
  | "custom_page";

export interface PublicRouteMetadataDefinition {
  routeKey: string;
  entityType: MetadataEntityType;
  pathPattern: string;
  indexable: boolean;
  defaultTitle: string;
  defaultDescription: string;
  canonicalPath: string;
  openGraphType: "website" | "profile" | "music.song" | "article";
  twitterCard: "summary" | "summary_large_image";
  structuredDataTypes: string[];
}

const routeDefinitions: PublicRouteMetadataDefinition[] = [
  { routeKey: "home", entityType: "homepage", pathPattern: "/", indexable: true, defaultTitle: "Ascend Nexus Media", defaultDescription: "Discover AI Persona Artists, original music, artwork, and visual stories from Ascend Nexus Media.", canonicalPath: "/", openGraphType: "website", twitterCard: "summary_large_image", structuredDataTypes: ["WebSite", "Organization"] },
  { routeKey: "artists", entityType: "artist_directory", pathPattern: "/artists", indexable: true, defaultTitle: "Artists", defaultDescription: "Explore Ascend Nexus Media AI Persona Artists.", canonicalPath: "/artists", openGraphType: "website", twitterCard: "summary_large_image", structuredDataTypes: ["CollectionPage"] },
  { routeKey: "artist", entityType: "artist", pathPattern: "/artists/:artistSlug", indexable: true, defaultTitle: "Artist", defaultDescription: "Explore this Ascend Nexus Media artist profile.", canonicalPath: "/artists/:artistSlug", openGraphType: "profile", twitterCard: "summary_large_image", structuredDataTypes: ["MusicGroup", "BreadcrumbList"] },
  { routeKey: "releases", entityType: "release_directory", pathPattern: "/songs", indexable: true, defaultTitle: "Songs", defaultDescription: "Browse original Ascend Nexus Media song releases.", canonicalPath: "/songs", openGraphType: "website", twitterCard: "summary_large_image", structuredDataTypes: ["CollectionPage"] },
  { routeKey: "release", entityType: "release", pathPattern: "/songs/:songSlug", indexable: true, defaultTitle: "Song Release", defaultDescription: "Listen to a public Ascend Nexus Media release preview.", canonicalPath: "/songs/:songSlug", openGraphType: "music.song", twitterCard: "summary_large_image", structuredDataTypes: ["MusicRecording", "BreadcrumbList"] },
  { routeKey: "gallery", entityType: "gallery", pathPattern: "/gallery", indexable: true, defaultTitle: "Gallery", defaultDescription: "Explore public Ascend Nexus Media visuals.", canonicalPath: "/gallery", openGraphType: "website", twitterCard: "summary_large_image", structuredDataTypes: ["CollectionPage"] },
  { routeKey: "gallery_item", entityType: "gallery_item", pathPattern: "/gallery/:galleryItemSlug", indexable: true, defaultTitle: "Gallery Item", defaultDescription: "View a public Ascend Nexus Media gallery item.", canonicalPath: "/gallery/:galleryItemSlug", openGraphType: "article", twitterCard: "summary_large_image", structuredDataTypes: ["ImageObject", "BreadcrumbList"] },
  { routeKey: "search", entityType: "search", pathPattern: "/search", indexable: false, defaultTitle: "Search", defaultDescription: "Search Ascend Nexus Media artists, releases, and visuals.", canonicalPath: "/search", openGraphType: "website", twitterCard: "summary", structuredDataTypes: [] },
  { routeKey: "browse", entityType: "browse", pathPattern: "/browse", indexable: false, defaultTitle: "Browse", defaultDescription: "Browse Ascend Nexus Media public content.", canonicalPath: "/browse", openGraphType: "website", twitterCard: "summary", structuredDataTypes: [] },
  { routeKey: "about", entityType: "about", pathPattern: "/about", indexable: true, defaultTitle: "About", defaultDescription: "Learn about Ascend Nexus Media.", canonicalPath: "/about", openGraphType: "website", twitterCard: "summary_large_image", structuredDataTypes: ["AboutPage"] },
  { routeKey: "contact", entityType: "contact", pathPattern: "/contact", indexable: true, defaultTitle: "Contact", defaultDescription: "Contact Ascend Nexus Media.", canonicalPath: "/contact", openGraphType: "website", twitterCard: "summary", structuredDataTypes: ["ContactPage"] },
  { routeKey: "privacy", entityType: "privacy", pathPattern: "/privacy", indexable: true, defaultTitle: "Privacy Policy", defaultDescription: "Read the Ascend Nexus Media privacy policy.", canonicalPath: "/privacy", openGraphType: "website", twitterCard: "summary", structuredDataTypes: [] },
  { routeKey: "terms", entityType: "terms", pathPattern: "/terms", indexable: true, defaultTitle: "Terms", defaultDescription: "Read the Ascend Nexus Media terms.", canonicalPath: "/terms", openGraphType: "website", twitterCard: "summary", structuredDataTypes: [] },
  { routeKey: "not_found", entityType: "not_found", pathPattern: "/404", indexable: false, defaultTitle: "Page Not Found", defaultDescription: "The requested Ascend Nexus Media page could not be found.", canonicalPath: "/404", openGraphType: "website", twitterCard: "summary", structuredDataTypes: [] },
];

const normalizePath = (path: string) => {
  const clean = path.split("?")[0]?.split("#")[0] || "/";
  if (!clean.startsWith("/")) return `/${clean}`;
  return clean.length > 1 ? clean.replace(/\/+$/, "") : "/";
};

export class PublicRouteMetadataCatalog {
  list() {
    return routeDefinitions;
  }

  normalizePath(path: string) {
    return normalizePath(path);
  }

  isAllowedPublicPath(path: string) {
    const clean = normalizePath(path);
    return clean.startsWith("/") && !clean.includes("..") && !clean.startsWith("/api") && !clean.startsWith("/admin") && !clean.startsWith("/private");
  }

  matchPath(path: string): { definition: PublicRouteMetadataDefinition; params: Record<string, string> } {
    const clean = normalizePath(path);
    if (clean.startsWith("/artists/")) return { definition: routeDefinitions.find((route) => route.routeKey === "artist")!, params: { artistSlug: decodeURIComponent(clean.replace("/artists/", "")) } };
    if (clean.startsWith("/songs/")) return { definition: routeDefinitions.find((route) => route.routeKey === "release")!, params: { songSlug: decodeURIComponent(clean.replace("/songs/", "")) } };
    if (clean.startsWith("/gallery/")) return { definition: routeDefinitions.find((route) => route.routeKey === "gallery_item")!, params: { galleryItemSlug: decodeURIComponent(clean.replace("/gallery/", "")) } };
    return { definition: routeDefinitions.find((route) => normalizePath(route.canonicalPath) === clean) ?? routeDefinitions.find((route) => route.routeKey === "not_found")!, params: {} };
  }
}

export const publicRouteMetadataCatalog = new PublicRouteMetadataCatalog();
