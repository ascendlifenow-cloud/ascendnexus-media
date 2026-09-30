import { useEffect } from "react";
import type { SocialShareMetadata } from "../models/social";
import { removeHeadElement, upsertMetaTag } from "../utils/headTags";

interface TwitterCardTagsProps {
  metadata: SocialShareMetadata;
}

export function TwitterCardTags({ metadata }: TwitterCardTagsProps) {
  useEffect(() => {
    upsertMetaTag('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: metadata.twitterCard ?? "summary_large_image",
    });
    upsertMetaTag('meta[name="twitter:title"]', { name: "twitter:title", content: metadata.title });
    upsertMetaTag('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: metadata.description,
    });

    if (metadata.imageUrl) {
      upsertMetaTag('meta[name="twitter:image"]', { name: "twitter:image", content: metadata.imageUrl });
      upsertMetaTag('meta[name="twitter:image:alt"]', {
        name: "twitter:image:alt",
        content: metadata.imageAlt ?? metadata.title,
      });
    } else {
      removeHeadElement('meta[name="twitter:image"]');
      removeHeadElement('meta[name="twitter:image:alt"]');
    }

    if (metadata.twitterSite) {
      upsertMetaTag('meta[name="twitter:site"]', { name: "twitter:site", content: metadata.twitterSite });
    } else {
      removeHeadElement('meta[name="twitter:site"]');
    }

    if (metadata.twitterCreator) {
      upsertMetaTag('meta[name="twitter:creator"]', {
        name: "twitter:creator",
        content: metadata.twitterCreator,
      });
    } else {
      removeHeadElement('meta[name="twitter:creator"]');
    }
  }, [metadata]);

  return null;
}
