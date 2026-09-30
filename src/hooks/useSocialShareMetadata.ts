import { useMemo } from "react";
import type { SeoMetadata } from "../models/seo";
import type { SocialShareMetadata } from "../models/social";
import { buildSocialShareMetadata } from "../utils/socialShareMetadata";

export function useSocialShareMetadata(
  metadata: Partial<SocialShareMetadata> | Partial<SeoMetadata> | undefined,
): SocialShareMetadata {
  return useMemo(() => buildSocialShareMetadata(metadata), [metadata]);
}
