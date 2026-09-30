import type { SeoMetadata } from "../models/seo";
import type { SocialShareMetadata } from "../models/social";
import { useSocialShareMetadata } from "../hooks/useSocialShareMetadata";
import { OpenGraphTags } from "./OpenGraphTags";
import { TwitterCardTags } from "./TwitterCardTags";

interface SocialShareHeadProps {
  metadata?: Partial<SocialShareMetadata> | Partial<SeoMetadata>;
}

export function SocialShareHead({ metadata }: SocialShareHeadProps) {
  const socialMetadata = useSocialShareMetadata(metadata);

  return (
    <>
      <OpenGraphTags metadata={socialMetadata} />
      <TwitterCardTags metadata={socialMetadata} />
    </>
  );
}
