import { useLocation } from "react-router-dom";
import { PublicPageMetadata } from "./metadata/PublicPageMetadata";
import { buildHomepageSocialMetadata } from "../utils/socialShareMetadata";
import { routeSeoMetadata } from "../utils/seoMetadata";

type RouteMetadataKey = keyof typeof routeSeoMetadata;

interface RouteMetadataProps {
  route: RouteMetadataKey;
}

export function RouteMetadata({ route }: RouteMetadataProps) {
  const location = useLocation();
  return (
    <PublicPageMetadata
      path={location.pathname}
      fallbackMetadata={routeSeoMetadata[route]}
      fallbackSocialMetadata={route === "home" ? buildHomepageSocialMetadata() : undefined}
    />
  );
}
