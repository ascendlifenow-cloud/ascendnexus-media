import { lazy, type ReactNode, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { PublicPageLoader } from "../components/loading";
import { RouteTransitionWrapper } from "../components/layout/RouteTransitionWrapper";
import { PublicShell } from "../components/public/PublicShell";
import { authenticationShellService } from "../services/auth/AuthenticationShellService";
import { AboutPage } from "../pages/AboutPage";
import { LegalPage } from "../pages/LegalPage";
import { PublicNotFoundPage } from "../pages/PublicNotFoundPage";
import { NewsletterConfirmationPage } from "../pages/NewsletterConfirmationPage";
import { NewsletterUnsubscribePage } from "../pages/NewsletterUnsubscribePage";
import { usePageViewTracking } from "../hooks/usePageViewTracking";

const AdminAppRoutes = lazy(() => import("./AdminAppRoutes").then(module => ({ default: module.AdminAppRoutes })));

const LandingPage = lazy(() => import("../pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const ArtworkCollagePage = lazy(() => import("../pages/ArtworkCollagePage").then((module) => ({ default: module.ArtworkCollagePage })));
const ArtistDirectoryPage = lazy(() => import("../pages/ArtistDirectoryPage").then((module) => ({ default: module.ArtistDirectoryPage })));
const ArtistDetailPage = lazy(() => import("../pages/ArtistDetailPage").then((module) => ({ default: module.ArtistDetailPage })));
const BrowsePage = lazy(() => import("../pages/BrowsePage").then((module) => ({ default: module.BrowsePage })));
const ContactPage = lazy(() => import("../pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const PublicGalleryPage = lazy(() => import("../pages/PublicGalleryPage").then((module) => ({ default: module.PublicGalleryPage })));
const PublicMemberLoginPage = lazy(() => import("../pages/MemberAccountPages").then((module) => ({ default: module.PublicMemberLoginPage })));
const MembershipPage = lazy(() => import("../pages/MembershipPage").then((module) => ({ default: module.MembershipPage })));
const PublicRegistrationReadinessPage = lazy(() => import("../pages/MemberAccountPages").then((module) => ({ default: module.PublicRegistrationReadinessPage })));
const VerifyEmailPage = lazy(() => import("../pages/MemberAccountPages").then((module) => ({ default: module.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import("../pages/MemberAccountPages").then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("../pages/MemberAccountPages").then((module) => ({ default: module.ResetPasswordPage })));
const LogoutPage = lazy(() => import("../pages/MemberAccountPages").then((module) => ({ default: module.LogoutPage })));
const AccountPage = lazy(() => import("../pages/MemberAccountPages").then((module) => ({ default: module.AccountPage })));
const ReleasesCatalogPage = lazy(() => import("../pages/ReleasesCatalogPage").then((module) => ({ default: module.ReleasesCatalogPage })));
const SearchPage = lazy(() => import("../pages/SearchPage").then((module) => ({ default: module.SearchPage })));
const SongDetailPage = lazy(() => import("../pages/SongDetailPage").then((module) => ({ default: module.SongDetailPage })));
const MemberLayout = lazy(() => import("../member/layouts/MemberLayout").then((module) => ({ default: module.MemberLayout })));
const MemberRouteGuard = lazy(() => import("../member/guards/MemberRouteGuard").then((module) => ({ default: module.MemberRouteGuard })));
const MemberDashboardPage = lazy(() => import("../member/pages/MemberDashboardPage").then((module) => ({ default: module.MemberDashboardPage })));
const MemberProfilePage = lazy(() => import("../member/pages/MemberProfilePage").then((module) => ({ default: module.MemberProfilePage })));
const MemberPreferencesPage = lazy(() => import("../member/pages/MemberPreferencesPage").then((module) => ({ default: module.MemberPreferencesPage })));
const MemberSecurityPage = lazy(() => import("../member/pages/MemberSecurityPage").then((module) => ({ default: module.MemberSecurityPage })));
const MemberSessionsPage = lazy(() => import("../member/pages/MemberSessionsPage").then((module) => ({ default: module.MemberSessionsPage })));
const MemberMembershipPage = lazy(() => import("../member/pages/MemberMembershipPage").then((module) => ({ default: module.MemberMembershipPage })));
const MemberEarlyAccessPage = lazy(() => import("../member/pages/MemberContentPages").then((module) => ({ default: module.MemberEarlyAccessPage })));
const MemberExclusiveContentPage = lazy(() => import("../member/pages/MemberContentPages").then((module) => ({ default: module.MemberExclusiveContentPage })));
const MemberRecommendationsPage = lazy(() => import("../member/pages/MemberContentPages").then((module) => ({ default: module.MemberRecommendationsPage })));
const MemberAccountStatePage = lazy(() => import("../member/pages/MemberContentPages").then((module) => ({ default: module.MemberAccountStatePage })));
const MemberFavoritesPage = lazy(() => import("../member/pages/MemberEngagementPages").then((module) => ({ default: module.MemberFavoritesPage })));
const MemberFollowingPage = lazy(() => import("../member/pages/MemberEngagementPages").then((module) => ({ default: module.MemberFollowingPage })));
const MemberPlaylistsPage = lazy(() => import("../member/pages/MemberEngagementPages").then((module) => ({ default: module.MemberPlaylistsPage })));
const MemberHistoryPage = lazy(() => import("../member/pages/MemberEngagementPages").then((module) => ({ default: module.MemberHistoryPage })));
const MemberNotificationsPage = lazy(() => import("../member/pages/MemberEngagementPages").then((module) => ({ default: module.MemberNotificationsPage })));
const MemberFeedPage = lazy(() => import("../member/pages/MemberEngagementPages").then((module) => ({ default: module.MemberFeedPage })));
const MemberSavedSearchesPage = lazy(() => import("../member/pages/MemberEngagementPages").then((module) => ({ default: module.MemberSavedSearchesPage })));
const MemberCollectionsPage = lazy(() => import("../member/pages/MemberEngagementPages").then((module) => ({ default: module.MemberCollectionsPage })));
const MemberRecommendationFeedbackPage = lazy(() => import("../member/pages/MemberEngagementPages").then((module) => ({ default: module.MemberRecommendationFeedbackPage })));
const MemberBillingPage = lazy(() => import("../member/pages/MemberBillingPages").then((module) => ({ default: module.MemberBillingPage })));

function IdentityAwarePublicRoute({ memberPath, children }: { memberPath: string; children: ReactNode }) {
  const [state, setState] = useState<"checking" | "guest" | "member">("checking");

  useEffect(() => {
    let active = true;
    authenticationShellService.getCurrentIdentity()
      .then((identity) => {
        if (active) setState(identity.kind === "member" ? "member" : "guest");
      })
      .catch(() => active && setState("guest"));
    return () => {
      active = false;
    };
  }, []);

  if (state === "checking") return <PublicPageLoader />;
  if (state === "member") return <Navigate to={memberPath} replace />;
  return <>{children}</>;
}

export function AppRouter() {
  usePageViewTracking();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  if (isAdminRoute) return <Suspense fallback={<PublicPageLoader />}><AdminAppRoutes /></Suspense>;

  return (
    <Suspense fallback={<PublicPageLoader />}>
      <RouteTransitionWrapper>
        <Routes>
          <Route path="/artwork" element={<IdentityAwarePublicRoute memberPath="/member/artwork"><ArtworkCollagePage /></IdentityAwarePublicRoute>} />
          <Route path="/artwork-collage" element={<IdentityAwarePublicRoute memberPath="/member/artwork"><ArtworkCollagePage /></IdentityAwarePublicRoute>} />
          <Route
            path="/member"
            element={
              <MemberRouteGuard>
                <MemberLayout />
              </MemberRouteGuard>
            }
          >
            <Route index element={<MemberDashboardPage />} />
            <Route path="home" element={<MemberDashboardPage />} />
            <Route path="artists" element={<ArtistDirectoryPage />} />
            <Route path="artists/:artistSlug" element={<ArtistDetailPage />} />
            <Route path="songs" element={<ReleasesCatalogPage />} />
            <Route path="songs/:songSlug" element={<SongDetailPage />} />
            <Route path="artwork" element={<ArtworkCollagePage />} />
            <Route path="profile" element={<MemberProfilePage />} />
            <Route path="preferences" element={<MemberPreferencesPage />} />
            <Route path="security" element={<MemberSecurityPage />} />
            <Route path="sessions" element={<MemberSessionsPage />} />
            <Route path="membership" element={<MemberMembershipPage />} />
            <Route path="account" element={<MemberMembershipPage />} />
            <Route path="billing" element={<MemberBillingPage focus="billing" />} />
            <Route path="subscription" element={<MemberBillingPage focus="subscription" />} />
            <Route path="payment-methods" element={<MemberBillingPage focus="payment-methods" />} />
            <Route path="invoices" element={<MemberBillingPage focus="invoices" />} />
            <Route path="receipts" element={<MemberBillingPage focus="receipts" />} />
            <Route path="cancel" element={<MemberBillingPage focus="cancel" />} />
            <Route path="upgrade" element={<MemberBillingPage focus="upgrade" />} />
            <Route path="downgrade" element={<MemberBillingPage focus="downgrade" />} />
            <Route path="billing-history" element={<MemberBillingPage focus="history" />} />
            <Route path="early-access" element={<MemberEarlyAccessPage />} />
            <Route path="exclusive-content" element={<MemberExclusiveContentPage />} />
            <Route path="recommendations" element={<MemberRecommendationsPage />} />
            <Route path="favorites" element={<MemberFavoritesPage />} />
            <Route path="following" element={<MemberFollowingPage />} />
            <Route path="history" element={<MemberHistoryPage />} />
            <Route path="playlists" element={<MemberPlaylistsPage />} />
            <Route path="notifications" element={<MemberNotificationsPage />} />
            <Route path="feed" element={<MemberFeedPage />} />
            <Route path="saved-searches" element={<MemberSavedSearchesPage />} />
            <Route path="collections" element={<MemberCollectionsPage />} />
            <Route path="recommendation-feedback" element={<MemberRecommendationFeedbackPage />} />
            <Route path="verification-required" element={<MemberAccountStatePage state="verification" />} />
            <Route path="membership-expired" element={<MemberAccountStatePage state="expired" />} />
            <Route path="suspended" element={<MemberAccountStatePage state="suspended" />} />
            <Route path="session-expired" element={<MemberAccountStatePage state="session-expired" />} />
          </Route>
          <Route element={<PublicShell />}>
            <Route path="/" element={<IdentityAwarePublicRoute memberPath="/member/home"><LandingPage /></IdentityAwarePublicRoute>} />
            <Route path="/artists" element={<IdentityAwarePublicRoute memberPath="/member/artists"><ArtistDirectoryPage /></IdentityAwarePublicRoute>} />
            <Route path="/artists/:artistSlug" element={<IdentityAwarePublicRoute memberPath={`/member${location.pathname}`}><ArtistDetailPage /></IdentityAwarePublicRoute>} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/gallery" element={<PublicGalleryPage />} />
            <Route path="/login" element={<PublicMemberLoginPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/account" element={<Navigate to="/member" replace />} />
            <Route path="/account/profile" element={<Navigate to="/member/profile" replace />} />
            <Route path="/account/security" element={<Navigate to="/member/security" replace />} />
            <Route path="/account/sessions" element={<Navigate to="/member/sessions" replace />} />
            <Route path="/account/preferences" element={<Navigate to="/member/preferences" replace />} />
            <Route path="/account/delete" element={<AccountPage section="delete" />} />
            <Route path="/newsletter/confirm" element={<NewsletterConfirmationPage />} />
            <Route path="/newsletter/unsubscribe" element={<NewsletterUnsubscribePage />} />
            <Route path="/privacy" element={<LegalPage type="privacy" />} />
            <Route path="/register" element={<PublicRegistrationReadinessPage />} />
            <Route path="/artwork" element={<IdentityAwarePublicRoute memberPath="/member/artwork"><ArtworkCollagePage /></IdentityAwarePublicRoute>} />
            <Route path="/artwork-collage" element={<IdentityAwarePublicRoute memberPath="/member/artwork"><ArtworkCollagePage /></IdentityAwarePublicRoute>} />
            <Route path="/releases" element={<IdentityAwarePublicRoute memberPath="/member/songs"><ReleasesCatalogPage /></IdentityAwarePublicRoute>} />
            <Route path="/releases/:songSlug" element={<IdentityAwarePublicRoute memberPath={location.pathname.replace(/^\/releases/, "/member/songs")}><SongDetailPage /></IdentityAwarePublicRoute>} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/songs" element={<IdentityAwarePublicRoute memberPath="/member/songs"><ReleasesCatalogPage /></IdentityAwarePublicRoute>} />
            <Route path="/songs/:songSlug" element={<IdentityAwarePublicRoute memberPath={`/member${location.pathname}`}><SongDetailPage /></IdentityAwarePublicRoute>} />
            <Route path="/terms" element={<LegalPage type="terms" />} />
            <Route path="*" element={<PublicNotFoundPage />} />
          </Route>
        </Routes>
      </RouteTransitionWrapper>
    </Suspense>
  );
}
