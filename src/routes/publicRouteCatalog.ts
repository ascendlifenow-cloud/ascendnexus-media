export interface PublicRouteDefinition {
  path: string;
  label: string;
  indexable: boolean;
  enabled: boolean;
  metadataRoute: "home" | "artists" | "releases" | "gallery" | "search" | "browse" | "contact" | "about" | "privacy" | "terms" | "notFound";
}

export const publicRouteCatalog: PublicRouteDefinition[] = [
  { path: "/", label: "Home", indexable: true, enabled: true, metadataRoute: "home" },
  { path: "/artists", label: "Artists", indexable: true, enabled: true, metadataRoute: "artists" },
  { path: "/songs", label: "Songs", indexable: true, enabled: true, metadataRoute: "releases" },
  { path: "/releases", label: "Releases", indexable: true, enabled: true, metadataRoute: "releases" },
  { path: "/gallery", label: "Gallery", indexable: true, enabled: true, metadataRoute: "gallery" },
  { path: "/search", label: "Search", indexable: false, enabled: true, metadataRoute: "search" },
  { path: "/browse", label: "Browse", indexable: true, enabled: true, metadataRoute: "browse" },
  { path: "/about", label: "About", indexable: true, enabled: true, metadataRoute: "about" },
  { path: "/contact", label: "Contact", indexable: true, enabled: true, metadataRoute: "contact" },
  { path: "/privacy", label: "Privacy", indexable: true, enabled: true, metadataRoute: "privacy" },
  { path: "/terms", label: "Terms", indexable: true, enabled: true, metadataRoute: "terms" },
];

export const getPublicRouteByPath = (path: string): PublicRouteDefinition | undefined =>
  publicRouteCatalog.find((route) => route.path === path);

