import type { ReactNode } from "react";
import type { SeoMetadata } from "../models/seo";
import type { SocialShareMetadata } from "../models/social";
import { useSeoMetadata } from "../hooks/useSeoMetadata";
import { SocialShareHead } from "./SocialShareHead";

interface SEOHeadProps {
  metadata?: Partial<SeoMetadata>;
  socialMetadata?: Partial<SocialShareMetadata>;
  fallbackTitle?: string;
  fallbackDescription?: string;
  disableSocial?: boolean;
  children?: ReactNode;
}

export function SEOHead({ metadata, socialMetadata, fallbackTitle, fallbackDescription, disableSocial = false, children }: SEOHeadProps) {
  const finalMetadata = useSeoMetadata({
    title: metadata?.title ?? fallbackTitle,
    description: metadata?.description ?? fallbackDescription,
    ...metadata,
  });

  return (
    <>
      {disableSocial ? null : <SocialShareHead metadata={socialMetadata ?? finalMetadata} />}
      {children ?? null}
    </>
  );
}
