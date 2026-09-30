import { useMemo } from "react";
import { analyticsService } from "../services/analytics";

export const useAnalytics = () =>
  useMemo(
    () => ({
      trackEvent: analyticsService.trackEvent.bind(analyticsService),
      trackPageView: analyticsService.trackPageView.bind(analyticsService),
      trackArtistView: analyticsService.trackArtistView.bind(analyticsService),
      trackSongView: analyticsService.trackSongView.bind(analyticsService),
      trackAudioPreviewPlay: analyticsService.trackAudioPreviewPlay.bind(analyticsService),
      trackAudioPreviewPause: analyticsService.trackAudioPreviewPause.bind(analyticsService),
      trackAudioPreviewEnded: analyticsService.trackAudioPreviewEnded.bind(analyticsService),
      trackAudioPreviewError: analyticsService.trackAudioPreviewError.bind(analyticsService),
      trackExternalLinkClick: analyticsService.trackExternalLinkClick.bind(analyticsService),
      trackCtaClick: analyticsService.trackCtaClick.bind(analyticsService),
      trackSearch: analyticsService.trackSearch.bind(analyticsService),
      trackBrowseFilter: analyticsService.trackBrowseFilter.bind(analyticsService),
      trackGalleryView: analyticsService.trackGalleryView.bind(analyticsService),
      trackGalleryFilter: analyticsService.trackGalleryFilter.bind(analyticsService),
      trackErrorState: analyticsService.trackErrorState.bind(analyticsService),
      trackFormEvent: analyticsService.trackFormEvent.bind(analyticsService),
      trackConsentEvent: analyticsService.trackConsentEvent.bind(analyticsService),
    }),
    [],
  );
