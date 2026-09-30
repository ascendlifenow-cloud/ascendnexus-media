import type { PublicSiteConfig, PublicSiteConfigSection } from "../../../src/models/admin";

export const defaultHomepageSections = (): PublicSiteConfigSection[] => [
  { sectionId: "hero", sectionType: "hero", enabled: true, sortOrder: 10, title: "Ascend Nexus Media", subtitle: "AI persona artists, original music, and visual worlds.", configuration: { primaryCtaLabel: "Explore Artists", primaryCtaRoute: "/artists" } },
  { sectionId: "featured-release", sectionType: "featured_release", enabled: true, sortOrder: 20, title: "Featured Release", configuration: { fallbackToLatest: true, showAudioPreview: true } },
  { sectionId: "latest-releases", sectionType: "latest_releases", enabled: true, sortOrder: 30, title: "Latest Releases", configuration: { maxReleasesPerArtist: 3, showArtistGrouping: true, showAudioPreview: true } },
  { sectionId: "artist-spotlight", sectionType: "artist_spotlight", enabled: true, sortOrder: 40, title: "Artist Spotlights", configuration: { maxArtists: 6, showLatestRelease: true } },
  { sectionId: "gallery-preview", sectionType: "gallery_preview", enabled: true, sortOrder: 50, title: "Visual Gallery", configuration: { maxItems: 6 } },
  { sectionId: "about", sectionType: "about", enabled: true, sortOrder: 60, title: "About Ascend Nexus Media", configuration: { showFeatureCards: true, visualPanelEnabled: true } },
];

export const defaultPublicSiteConfig = (): PublicSiteConfig => ({
  siteName: "Ascend Nexus Media",
  siteDescription: "AI persona artists, cinematic releases, and public creative media from Ascend Nexus Media.",
  homepageSections: defaultHomepageSections(),
  navigationLinks: [
    { label: "Home", href: "/", enabled: true, sortOrder: 10 },
    { label: "Artists", href: "/artists", enabled: true, sortOrder: 20 },
    { label: "Songs", href: "/songs", enabled: true, sortOrder: 30 },
    { label: "Gallery", href: "/gallery", enabled: true, sortOrder: 40 },
    { label: "Browse", href: "/browse", enabled: true, sortOrder: 50 },
    { label: "Contact", href: "/contact", enabled: true, sortOrder: 60 },
  ],
  footerLinks: [
    { label: "Artists", href: "/artists", enabled: true, sortOrder: 10 },
    { label: "Songs", href: "/songs", enabled: true, sortOrder: 20 },
    { label: "Gallery", href: "/gallery", enabled: true, sortOrder: 30 },
    { label: "Contact", href: "/contact", enabled: true, sortOrder: 40 },
  ],
  socialLinks: {},
  seoDefaults: {
    siteName: "Ascend Nexus Media",
    defaultTitle: "Ascend Nexus Media | AI Persona Artists & Original Music",
    defaultDescription: "Discover Ascend Nexus Media, a creative home for AI Persona Artists and original songs.",
    basePath: "",
  },
  contactEmail: "hello@ascendnexusmedia.com",
  contactCtaText: "For collaborations, artist features, media projects, or creative inquiries, reach out and connect with Ascend Nexus Media.",
  newsletterEnabled: false,
  contactPageEnabled: true,
  themeConfig: { primaryColor: "electric", accentColor: "gold", logoVariant: "default" },
  updatedAt: new Date().toISOString(),
});
