import { useEffect } from "react";
import type { SocialShareMetadata } from "../models/social";
import { removeHeadElement, upsertMetaTag } from "../utils/headTags";

interface OpenGraphTagsProps {
  metadata: SocialShareMetadata;
}

export function OpenGraphTags({ metadata }: OpenGraphTagsProps) {
  useEffect(() => {
    upsertMetaTag('meta[property="og:title"]', { property: "og:title", content: metadata.title });
    upsertMetaTag('meta[property="og:description"]', {
      property: "og:description",
      content: metadata.description,
    });
    upsertMetaTag('meta[property="og:type"]', { property: "og:type", content: metadata.type ?? "website" });
    upsertMetaTag('meta[property="og:site_name"]', {
      property: "og:site_name",
      content: metadata.siteName ?? "Ascend Nexus Media",
    });

    if (metadata.url) {
      upsertMetaTag('meta[property="og:url"]', { property: "og:url", content: metadata.url });
    } else {
      removeHeadElement('meta[property="og:url"]');
    }

    if (metadata.imageUrl) {
      upsertMetaTag('meta[property="og:image"]', { property: "og:image", content: metadata.imageUrl });
      upsertMetaTag('meta[property="og:image:alt"]', {
        property: "og:image:alt",
        content: metadata.imageAlt ?? metadata.title,
      });
    } else {
      removeHeadElement('meta[property="og:image"]');
      removeHeadElement('meta[property="og:image:alt"]');
    }

    if (metadata.type === "music.song" && metadata.audioUrl) {
      upsertMetaTag('meta[property="og:audio"]', { property: "og:audio", content: metadata.audioUrl });
    } else {
      removeHeadElement('meta[property="og:audio"]');
    }

    if (metadata.type === "music.song" && metadata.musician) {
      upsertMetaTag('meta[property="music:musician"]', { property: "music:musician", content: metadata.musician });
    } else {
      removeHeadElement('meta[property="music:musician"]');
    }

    if (metadata.type === "music.song" && metadata.releaseDate) {
      upsertMetaTag('meta[property="music:release_date"]', {
        property: "music:release_date",
        content: metadata.releaseDate,
      });
    } else {
      removeHeadElement('meta[property="music:release_date"]');
    }
  }, [metadata]);

  return null;
}
