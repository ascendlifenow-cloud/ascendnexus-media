import type { ContactPageConfig } from "../models/contact";
import type { ExternalLink } from "../models/ExternalLink";
import { publicMediaApiClient } from "./public/PublicMediaApiClient";

const exploreLinks = [
  { label: "Explore Artists", description: "Meet the AI Persona Artists shaping the Ascend Nexus Media sound.", href: "/artists", enabled: true },
  { label: "Browse Music", description: "Browse releases by genre, mood, style, and creative direction.", href: "/browse", enabled: true },
  { label: "View Gallery", description: "Explore cover art, artist visuals, and public gallery imagery.", href: "/gallery", enabled: true },
  { label: "Search Catalog", description: "Search artists, songs, genres, and creative styles.", href: "/search", enabled: true },
];

export class ContactService {
  async getContactPageConfig(): Promise<ContactPageConfig> {
    const site = await publicMediaApiClient.getSiteConfiguration();
    const contactSettings = site.contactSettings as Record<string, string | undefined>;
    const publicEmail = contactSettings?.publicEmail;
    const followLinks: ExternalLink[] = publicEmail
      ? [{ platform: "email", label: "Email Ascend Nexus Media", url: `mailto:${publicEmail}`, enabled: true, sortOrder: 10, type: "website" }]
      : [];
    return {
      pageEnabled: contactSettings?.contactPageEnabled !== "false",
      contactEmail: publicEmail,
      contactCtaText: contactSettings?.contactCtaText ?? "Send a secure inquiry through the public contact form.",
      newsletterEnabled: contactSettings?.newsletterEnabled === "true",
      followLinks,
      exploreLinks,
      metadata: {
        contactFormOperational: contactSettings?.contactFormOperational === "true",
        newsletterOperational: contactSettings?.newsletterOperational === "true",
      },
    };
  }
}
