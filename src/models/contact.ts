import type { ExternalLink } from "./ExternalLink";

export interface ContactExploreLink {
  label: string;
  description: string;
  href: string;
  enabled: boolean;
}

export interface ContactPageConfig {
  pageEnabled: boolean;
  contactEmail?: string;
  contactCtaText: string;
  newsletterEnabled: boolean;
  followLinks: ExternalLink[];
  exploreLinks: ContactExploreLink[];
  metadata?: Record<string, string | number | boolean | null>;
}
