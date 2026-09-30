import {
  Disc3,
  ExternalLink as ExternalLinkIconBase,
  Globe,
  Headphones,
  Instagram,
  Link,
  Mail,
  Music2,
  Radio,
  Video,
  Youtube,
} from "lucide-react";
import { normalizeExternalLinkPlatform } from "../../utils/externalLinksUtils";

interface ExternalLinkIconProps {
  platform: string;
  className?: string;
}

export function ExternalLinkIcon({ platform, className = "h-4 w-4" }: ExternalLinkIconProps) {
  const normalizedPlatform = normalizeExternalLinkPlatform(platform);
  const icons = {
    spotify: Headphones,
    appleMusic: Music2,
    youtube: Youtube,
    suno: Disc3,
    soundcloud: Radio,
    tiktok: Video,
    instagram: Instagram,
    website: Globe,
    email: Mail,
    custom: Link,
  };
  const Icon = icons[normalizedPlatform as keyof typeof icons] ?? ExternalLinkIconBase;

  return <Icon className={className} aria-hidden="true" />;
}
