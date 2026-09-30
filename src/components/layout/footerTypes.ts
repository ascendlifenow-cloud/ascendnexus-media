import type { LucideIcon } from "lucide-react";

export interface FooterNavLink {
  label: string;
  href: string;
  enabled?: boolean;
}

export interface FooterArtistLink {
  label: string;
  href: string;
  enabled?: boolean;
}

export interface FooterSocialLink {
  platform: string;
  label: string;
  href: string;
  enabled?: boolean;
  icon?: LucideIcon;
}

export interface FooterCTAConfig {
  label: string;
  href: string;
  enabled?: boolean;
}
