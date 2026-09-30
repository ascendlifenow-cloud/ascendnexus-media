import { lazy, type ReactNode, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminLayout } from "../admin/layout/AdminLayout";
import {
  AdminAccessDeniedPage,
  AdminAccessManagementPage,
  AdminAccountSecurityPage,
  AdminArtistsPage,
  AdminArtistFormPage,
  AdminArtistPreviewPage,
  AdminAuditLogPage,
  AdminAuthenticationHealthPage,
  AdminArtworkCollagePage,
  AdminBillingPage,
  AdminActivationPage,
  AdminDashboardPage,
  AdminDeploymentPage,
  AdminDevelopmentSeedsPage,
  AdminDistributionPage,
  AdminExportsPage,
  AdminCreateExportPage,
  AdminExportImportCertificationPage,
  AdminFinalLaunchSignoffPage,
  AdminExportImportSecurityPage,
  AdminImportsPage,
  AdminCreateImportPage,
  AdminTrustedSignersPage,
  AdminForgotPasswordPage,
  AdminGalleryFormPage,
  AdminGalleryPage,
  AdminGalleryPreviewPage,
  AdminHomepagePage,
  AdminHomepagePreviewPage,
  AdminHomepageSectionFormPage,
  AdminIntelligencePage,
  AdminLaunchExperiencePage,
  AdminLaunchInfrastructurePage,
  AdminLaunchSecurityRecoveryPage,
  AdminLaunchReadinessPage,
  AdminLoginPage,
  AdminMediaFormPage,
  AdminMediaPage,
  AdminMediaProcessingPage,
  AdminMediaReviewQueuePage,
  AdminMemberEngagementPage,
  AdminMemberEcosystemCertificationPage,
  AdminMembersPage,
  AdminMemberExperiencePage,
  AdminMetadataFormPage,
  AdminMetadataPreviewPage,
  AdminObservabilityDashboard,
  AdminOperationsPage,
  AdminOperationsCertificationPage,
  AdminProtectedContentPage,
  AdminReleaseFormPage,
  AdminReleasePreviewPage,
  AdminReleasesPage,
  AdminResetPasswordPage,
  AdminSeoPage,
  AdminSettingsPage,
  AdminUsersPage,
} from "../admin/pages";
import { AdminAuthProvider } from "../admin/auth/AdminAuthProvider";
import { RequirePermission } from "../admin/auth/RequirePermission";
import { AdminProtectedRoute } from "../admin/routes/AdminProtectedRoute";
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

  if (isAdminRoute) {
    return (
      <Suspense fallback={<PublicPageLoader />}>
        <AdminAuthProvider>
          <Routes>
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
            <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />
            <Route path="/admin/activate" element={<AdminActivationPage />} />
            <Route path="/admin/access-denied" element={<AdminAccessDeniedPage />} />
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="artwork-collage" element={<RequirePermission permission="media.read"><AdminArtworkCollagePage /></RequirePermission>} />
              <Route path="production-certification" element={<RequirePermission permission="launch.certification.read"><AdminMemberEcosystemCertificationPage focus="production-certification" /></RequirePermission>} />
              <Route path="launch-readiness" element={<RequirePermission permission="launch.certification.read"><AdminLaunchReadinessPage /></RequirePermission>} />
              <Route path="launch-readiness/experience" element={<RequirePermission permission="launch.certification.read"><AdminLaunchExperiencePage /></RequirePermission>} />
              <Route path="launch-readiness/admin-operations" element={<RequirePermission permission="launch.certification.read"><AdminOperationsCertificationPage /></RequirePermission>} />
              <Route path="launch-readiness/infrastructure" element={<RequirePermission permission="launch_infrastructure.read"><AdminLaunchInfrastructurePage /></RequirePermission>} />
              <Route path="launch-readiness/security-recovery" element={<RequirePermission permission="launch_security.read"><AdminLaunchSecurityRecoveryPage /></RequirePermission>} />
              <Route path="launch-readiness/final-signoff" element={<RequirePermission permission="launch_final.read"><AdminFinalLaunchSignoffPage /></RequirePermission>} />
              <Route path="member-certification" element={<RequirePermission permission="launch.certification.read"><AdminMemberEcosystemCertificationPage focus="member-certification" /></RequirePermission>} />
              <Route path="security-certification" element={<RequirePermission permission="launch.certification.read"><AdminMemberEcosystemCertificationPage focus="security-certification" /></RequirePermission>} />
              <Route path="performance-certification" element={<RequirePermission permission="launch.certification.read"><AdminMemberEcosystemCertificationPage focus="performance-certification" /></RequirePermission>} />
              <Route path="billing" element={<RequirePermission permission="users.read"><AdminBillingPage focus="billing" /></RequirePermission>} />
              <Route path="subscriptions" element={<RequirePermission permission="users.read"><AdminBillingPage focus="subscriptions" /></RequirePermission>} />
              <Route path="payments" element={<RequirePermission permission="users.read"><AdminBillingPage focus="payments" /></RequirePermission>} />
              <Route path="invoices" element={<RequirePermission permission="users.read"><AdminBillingPage focus="invoices" /></RequirePermission>} />
              <Route path="refunds" element={<RequirePermission permission="users.manage"><AdminBillingPage focus="refunds" /></RequirePermission>} />
              <Route path="coupons" element={<RequirePermission permission="users.manage"><AdminBillingPage focus="coupons" /></RequirePermission>} />
              <Route path="promotions" element={<RequirePermission permission="users.manage"><AdminBillingPage focus="promotions" /></RequirePermission>} />
              <Route path="gifts" element={<RequirePermission permission="users.manage"><AdminBillingPage focus="gifts" /></RequirePermission>} />
              <Route path="revenue" element={<RequirePermission permission="users.read"><AdminBillingPage focus="revenue" /></RequirePermission>} />
              <Route path="payment-providers" element={<RequirePermission permission="users.read"><AdminBillingPage focus="payment-providers" /></RequirePermission>} />
              <Route path="users" element={<RequirePermission permission="users.read"><AdminUsersPage /></RequirePermission>} />
              <Route path="members" element={<RequirePermission permission="users.read"><AdminMembersPage /></RequirePermission>} />
              <Route path="members/:memberId" element={<RequirePermission permission="users.read"><AdminMembersPage /></RequirePermission>} />
              <Route path="member-search" element={<RequirePermission permission="users.read"><AdminMembersPage /></RequirePermission>} />
              <Route path="member-health" element={<RequirePermission anyOf={["security.read", "users.read"]}><AdminMembersPage focus="health" /></RequirePermission>} />
              <Route path="member-audit" element={<RequirePermission permission="audit.read"><AdminMembersPage focus="audit" /></RequirePermission>} />
              <Route path="member-security" element={<RequirePermission permission="security.read"><AdminMembersPage focus="security" /></RequirePermission>} />
              <Route path="member-support" element={<RequirePermission permission="users.read"><AdminMembersPage focus="support" /></RequirePermission>} />
              <Route path="member-notifications" element={<RequirePermission permission="users.read"><AdminMembersPage focus="notifications" /></RequirePermission>} />
              <Route path="member-subscriptions" element={<RequirePermission permission="users.read"><AdminMembersPage focus="subscriptions" /></RequirePermission>} />
              <Route path="member-entitlements" element={<RequirePermission permission="users.read"><AdminMembersPage focus="entitlements" /></RequirePermission>} />
              <Route path="member-sessions" element={<RequirePermission permission="users.read"><AdminMembersPage focus="sessions" /></RequirePermission>} />
              <Route path="member-risk" element={<RequirePermission anyOf={["security.read", "users.read"]}><AdminMembersPage focus="risk" /></RequirePermission>} />
              <Route path="member-moderation" element={<RequirePermission permission="users.read"><AdminMembersPage focus="moderation" /></RequirePermission>} />
              <Route path="member-experience" element={<RequirePermission anyOf={["users.read", "system.health.read"]}><AdminMemberExperiencePage /></RequirePermission>} />
              <Route path="member-experience/health" element={<RequirePermission anyOf={["users.read", "system.health.read"]}><AdminMemberExperiencePage /></RequirePermission>} />
              <Route path="member-engagement" element={<RequirePermission anyOf={["users.read", "analytics.read"]}><AdminMemberEngagementPage focus="overview" /></RequirePermission>} />
              <Route path="playlists" element={<RequirePermission anyOf={["users.read", "analytics.read"]}><AdminMemberEngagementPage focus="playlists" /></RequirePermission>} />
              <Route path="notifications" element={<RequirePermission anyOf={["users.read", "analytics.read"]}><AdminMemberEngagementPage focus="notifications" /></RequirePermission>} />
              <Route path="member-feed" element={<RequirePermission anyOf={["users.read", "analytics.read"]}><AdminMemberEngagementPage focus="member-feed" /></RequirePermission>} />
              <Route path="recommendation-feedback" element={<RequirePermission anyOf={["users.read", "analytics.read"]}><AdminMemberEngagementPage focus="recommendation-feedback" /></RequirePermission>} />
              <Route path="member-activity" element={<RequirePermission anyOf={["users.read", "analytics.read"]}><AdminMembersPage focus="activity" /></RequirePermission>} />
              <Route path="membership-tiers" element={<RequirePermission permission="users.read"><AdminAccessManagementPage focus="membership-tiers" /></RequirePermission>} />
              <Route path="membership-plans" element={<RequirePermission permission="users.read"><AdminAccessManagementPage focus="membership-plans" /></RequirePermission>} />
              <Route path="entitlements" element={<RequirePermission permission="users.read"><AdminAccessManagementPage focus="entitlements" /></RequirePermission>} />
              <Route path="tier-entitlements" element={<RequirePermission permission="users.manage"><AdminAccessManagementPage focus="tier-entitlements" /></RequirePermission>} />
              <Route path="member-access-grants" element={<RequirePermission permission="users.manage"><AdminAccessManagementPage focus="member-access-grants" /></RequirePermission>} />
              <Route path="access-policies" element={<RequirePermission permission="users.read"><AdminAccessManagementPage focus="access-policies" /></RequirePermission>} />
              <Route path="access-overrides" element={<RequirePermission permission="users.manage"><AdminAccessManagementPage focus="access-overrides" /></RequirePermission>} />
              <Route path="access-simulator" element={<RequirePermission permission="users.read"><AdminAccessManagementPage focus="access-simulator" /></RequirePermission>} />
              <Route path="access-health" element={<RequirePermission anyOf={["security.read", "users.read"]}><AdminAccessManagementPage focus="access-health" /></RequirePermission>} />
              <Route path="content-access" element={<RequirePermission permission="users.read"><AdminAccessManagementPage focus="content-access" /></RequirePermission>} />
              <Route path="protected-content" element={<RequirePermission anyOf={["security.read", "media.read"]}><AdminProtectedContentPage focus="overview" /></RequirePermission>} />
              <Route path="protected-content/delivery-profiles" element={<RequirePermission anyOf={["security.read", "media.read"]}><AdminProtectedContentPage focus="delivery-profiles" /></RequirePermission>} />
              <Route path="protected-content/assets" element={<RequirePermission anyOf={["security.read", "media.read"]}><AdminProtectedContentPage focus="assets" /></RequirePermission>} />
              <Route path="protected-content/playback-sessions" element={<RequirePermission anyOf={["security.read", "media.read"]}><AdminProtectedContentPage focus="playback-sessions" /></RequirePermission>} />
              <Route path="protected-content/takedowns" element={<RequirePermission anyOf={["security.read", "media.read"]}><AdminProtectedContentPage focus="takedowns" /></RequirePermission>} />
              <Route path="account/security" element={<RequirePermission permission="admin.access"><AdminAccountSecurityPage /></RequirePermission>} />
              <Route path="system/authentication" element={<RequirePermission anyOf={["security.read", "users.manage"]}><AdminAuthenticationHealthPage /></RequirePermission>} />
              <Route path="audit" element={<RequirePermission permission="audit.read"><AdminAuditLogPage /></RequirePermission>} />
              <Route path="artists" element={<RequirePermission permission="artists.read"><AdminArtistsPage /></RequirePermission>} />
              <Route path="artists/new" element={<RequirePermission permission="artists.create"><AdminArtistFormPage /></RequirePermission>} />
              <Route path="artists/:artistId/edit" element={<RequirePermission permission="artists.update"><AdminArtistFormPage /></RequirePermission>} />
              <Route path="artists/:artistId/intelligence" element={<RequirePermission permission="intelligence.read"><AdminIntelligencePage focus="artist-intelligence" /></RequirePermission>} />
              <Route path="releases" element={<RequirePermission permission="releases.read"><AdminReleasesPage /></RequirePermission>} />
              <Route path="releases/new" element={<RequirePermission permission="releases.create"><AdminReleaseFormPage /></RequirePermission>} />
              <Route path="releases/:releaseId/edit" element={<RequirePermission permission="releases.update"><AdminReleaseFormPage /></RequirePermission>} />
              <Route path="media" element={<RequirePermission permission="media.read"><AdminMediaPage /></RequirePermission>} />
              <Route path="media-review" element={<RequirePermission permission="media.read"><AdminMediaReviewQueuePage /></RequirePermission>} />
              <Route path="media/processing" element={<RequirePermission permission="media.processing.read"><AdminMediaProcessingPage /></RequirePermission>} />
              <Route path="media/review" element={<RequirePermission permission="media.read"><AdminMediaReviewQueuePage /></RequirePermission>} />
              <Route path="media/new" element={<RequirePermission permission="media.upload"><AdminMediaFormPage /></RequirePermission>} />
              <Route path="media/:assetId/edit" element={<RequirePermission permission="media.edit"><AdminMediaFormPage /></RequirePermission>} />
              <Route path="exports" element={<RequirePermission permission="exports.read"><AdminExportsPage /></RequirePermission>} />
              <Route path="exports/new" element={<RequirePermission permission="exports.create"><AdminCreateExportPage /></RequirePermission>} />
              <Route path="imports" element={<RequirePermission permission="imports.read"><AdminImportsPage /></RequirePermission>} />
              <Route path="imports/new" element={<RequirePermission permission="imports.upload"><AdminCreateImportPage /></RequirePermission>} />
              <Route path="imports/trusted-signers" element={<RequirePermission permission="imports.signers.read"><AdminTrustedSignersPage /></RequirePermission>} />
              <Route path="export-import/security" element={<RequirePermission permission="export_import.security.read"><AdminExportImportSecurityPage /></RequirePermission>} />
              <Route path="export-import/certification" element={<RequirePermission permission="export_import.certification.read"><AdminExportImportCertificationPage /></RequirePermission>} />
              <Route path="gallery" element={<RequirePermission permission="gallery.read"><AdminGalleryPage /></RequirePermission>} />
              <Route path="gallery/new" element={<RequirePermission permission="gallery.create"><AdminGalleryFormPage /></RequirePermission>} />
              <Route path="gallery/:galleryItemId/edit" element={<RequirePermission permission="gallery.update"><AdminGalleryFormPage /></RequirePermission>} />
              <Route path="homepage" element={<RequirePermission permission="homepage.read"><AdminHomepagePage /></RequirePermission>} />
              <Route path="homepage/sections/new" element={<RequirePermission permission="homepage.update"><AdminHomepageSectionFormPage /></RequirePermission>} />
              <Route path="homepage/sections/:sectionId/edit" element={<RequirePermission permission="homepage.update"><AdminHomepageSectionFormPage /></RequirePermission>} />
              <Route path="seo" element={<RequirePermission permission="metadata.read"><AdminSeoPage /></RequirePermission>} />
              <Route path="seo/:metadataRecordId/edit" element={<RequirePermission permission="metadata.update"><AdminMetadataFormPage /></RequirePermission>} />
              <Route path="operations" element={<RequirePermission permission="operations.read"><AdminOperationsPage focus="overview" /></RequirePermission>} />
              <Route path="distribution" element={<RequirePermission permission="distribution.read"><AdminDistributionPage focus="overview" /></RequirePermission>} />
              <Route path="intelligence" element={<RequirePermission permission="intelligence.read"><AdminIntelligencePage focus="overview" /></RequirePermission>} />
              <Route path="artists/intelligence" element={<RequirePermission permission="intelligence.read"><AdminIntelligencePage focus="artists-intelligence" /></RequirePermission>} />
              <Route path="audience" element={<RequirePermission permission="intelligence.read"><AdminIntelligencePage focus="audience" /></RequirePermission>} />
              <Route path="trends" element={<RequirePermission permission="intelligence.read"><AdminIntelligencePage focus="trends" /></RequirePermission>} />
              <Route path="recommendations" element={<RequirePermission permission="intelligence.read"><AdminIntelligencePage focus="recommendations" /></RequirePermission>} />
              <Route path="platform-comparison" element={<RequirePermission permission="intelligence.read"><AdminIntelligencePage focus="platform-comparison" /></RequirePermission>} />
              <Route path="growth-forecast" element={<RequirePermission permission="intelligence.read"><AdminIntelligencePage focus="growth-forecast" /></RequirePermission>} />
              <Route path="reports" element={<RequirePermission permission="intelligence.reports"><AdminIntelligencePage focus="reports" /></RequirePermission>} />
              <Route path="platforms" element={<RequirePermission permission="platforms.read"><AdminDistributionPage focus="platforms" /></RequirePermission>} />
              <Route path="distribution-history" element={<RequirePermission permission="distribution.read"><AdminDistributionPage focus="distribution-history" /></RequirePermission>} />
              <Route path="platform-health" element={<RequirePermission permission="platforms.read"><AdminDistributionPage focus="platform-health" /></RequirePermission>} />
              <Route path="platform-analytics" element={<RequirePermission permission="distribution.read"><AdminDistributionPage focus="platform-analytics" /></RequirePermission>} />
              <Route path="platform-connectors" element={<RequirePermission permission="platforms.read"><AdminDistributionPage focus="platform-connectors" /></RequirePermission>} />
              <Route path="platform-rate-limits" element={<RequirePermission permission="platforms.read"><AdminDistributionPage focus="platform-rate-limits" /></RequirePermission>} />
              <Route path="platform-errors" element={<RequirePermission permission="distribution.read"><AdminDistributionPage focus="platform-errors" /></RequirePermission>} />
              <Route path="release-calendar" element={<RequirePermission permission="operations.read"><AdminOperationsPage focus="release-calendar" /></RequirePermission>} />
              <Route path="content-pipeline" element={<RequirePermission permission="operations.read"><AdminOperationsPage focus="content-pipeline" /></RequirePermission>} />
              <Route path="artist-roadmap" element={<RequirePermission permission="operations.read"><AdminOperationsPage focus="artist-roadmap" /></RequirePermission>} />
              <Route path="publishing-queue" element={<RequirePermission permission="operations.read"><AdminOperationsPage focus="publishing-queue" /></RequirePermission>} />
              <Route path="release-verification" element={<RequirePermission permission="operations.read"><AdminOperationsPage focus="release-verification" /></RequirePermission>} />
              <Route path="social-campaigns" element={<RequirePermission permission="operations.read"><AdminOperationsPage focus="social-campaigns" /></RequirePermission>} />
              <Route path="newsletter-campaigns" element={<RequirePermission permission="operations.read"><AdminOperationsPage focus="newsletter-campaigns" /></RequirePermission>} />
              <Route path="content-health" element={<RequirePermission permission="operations.read"><AdminOperationsPage focus="content-health" /></RequirePermission>} />
              <Route path="optimization" element={<RequirePermission permission="optimization.read"><AdminOperationsPage focus="optimization" /></RequirePermission>} />
              <Route path="platform-growth" element={<RequirePermission permission="operations.read"><AdminOperationsPage focus="platform-growth" /></RequirePermission>} />
              <Route path="system/deployment" element={<RequirePermission permission="deployment.read"><AdminDeploymentPage /></RequirePermission>} />
              <Route path="development/seeds" element={<RequirePermission permission="users.manage"><AdminDevelopmentSeedsPage /></RequirePermission>} />
              <Route path="system/observability" element={<RequirePermission permission="observability.read"><AdminObservabilityDashboard /></RequirePermission>} />
              <Route path="preview/artist/:artistId" element={<AdminArtistPreviewPage />} />
              <Route path="preview/release/:releaseId" element={<AdminReleasePreviewPage />} />
              <Route path="preview/gallery/:galleryItemId" element={<AdminGalleryPreviewPage />} />
              <Route path="preview/homepage" element={<AdminHomepagePreviewPage />} />
              <Route path="preview/metadata/:metadataRecordId" element={<AdminMetadataPreviewPage />} />
              <Route path="settings" element={<RequirePermission permission="site_settings.read"><AdminSettingsPage /></RequirePermission>} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Routes>
        </AdminAuthProvider>
      </Suspense>
    );
  }

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
