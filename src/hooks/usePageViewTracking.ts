import { useEffect, useRef } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { useAnalytics } from "./useAnalytics";
import { useAnalyticsConsent } from "./public/useAnalyticsConsent";

const routePatterns = [
  "/",
  "/artists",
  "/artists/:artistSlug",
  "/songs/:songSlug",
  "/songs",
  "/releases",
  "/search",
  "/browse",
  "/gallery",
  "/contact",
];

const getRoutePattern = (pathname: string) =>
  routePatterns.find((pattern) => matchPath({ path: pattern, end: true }, pathname)) ?? "404";

export const usePageViewTracking = () => {
  const location = useLocation();
  const analytics = useAnalytics();
  const { consent } = useAnalyticsConsent();
  const lastTrackedRoute = useRef<string | undefined>(undefined);

  useEffect(() => {
    const route = location.pathname;
    if (location.pathname.startsWith("/admin")) return;
    if (lastTrackedRoute.current === route) return;

    lastTrackedRoute.current = route;
    const routePattern = getRoutePattern(location.pathname);

    void analytics.trackPageView(route, {
      routePattern,
      isNotFound: routePattern === "404",
    });

    if (routePattern === "404") {
      void analytics.trackErrorState("not_found", route, {
        routePattern,
      });
    }
  }, [analytics, consent?.updatedAt, location.pathname]);
};
