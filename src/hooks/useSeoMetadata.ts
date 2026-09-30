import { useEffect, useMemo } from "react";
import type { SeoMetadata } from "../models/seo";
import { buildDefaultSeoMetadata } from "../utils/seoMetadata";
import { siteSeoDefaults } from "../utils/siteSeoDefaults";
import { upsertLinkTag, upsertMetaTag } from "../utils/headTags";

const resolveCanonicalUrl = (canonicalPath: string | undefined): string | undefined => {
  if (!canonicalPath) return undefined;
  if (canonicalPath.startsWith("http://") || canonicalPath.startsWith("https://")) return canonicalPath;
  if (siteSeoDefaults.basePath) return `${siteSeoDefaults.basePath}${canonicalPath}`;
  return canonicalPath;
};

export function useSeoMetadata(metadata: Partial<SeoMetadata> | undefined): SeoMetadata {
  const finalMetadata = useMemo(() => buildDefaultSeoMetadata(metadata), [metadata]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.title = finalMetadata.title;
    upsertMetaTag('meta[name="description"]', { name: "description", content: finalMetadata.description });
    upsertMetaTag('meta[name="robots"]', {
      name: "robots",
      content: finalMetadata.noIndex ? "noindex,nofollow" : "index,follow",
    });

    if (finalMetadata.keywords?.length) {
      upsertMetaTag('meta[name="keywords"]', { name: "keywords", content: finalMetadata.keywords.join(", ") });
    }

    const canonicalUrl = resolveCanonicalUrl(finalMetadata.canonicalPath);
    if (canonicalUrl) {
      upsertLinkTag('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });
    }
  }, [finalMetadata]);

  return finalMetadata;
}
