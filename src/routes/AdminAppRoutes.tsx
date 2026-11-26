import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { PublicPageLoader } from "../components/loading";
import { AdminLayout } from "../admin/layout/AdminLayout";
import { AdminAuthProvider } from "../admin/auth/AdminAuthProvider";
import { RequirePermission } from "../admin/auth/RequirePermission";
import { AdminProtectedRoute } from "../admin/routes/AdminProtectedRoute";
import { AdminRouteErrorBoundary } from "../admin/components/AdminRouteErrorBoundary";
const AdminProductionWorkspacePage = lazy(() => import("../admin/pages/AdminProductionWorkspacePage").then(module => ({ default: module.AdminProductionWorkspacePage })));
const AdminAgentStatusPage = lazy(() => import("../admin/pages/AdminAgentStatusPage").then(module => ({ default: module.AdminAgentStatusPage })));
const AdminAccessDeniedPage = lazy(() => import("../admin/pages/AdminAccessDeniedPage").then(module => ({ default: module.AdminAccessDeniedPage })));
const AdminAccessManagementPage = lazy(() => import("../admin/pages/AdminAccessManagementPage").then(module => ({ default: module.AdminAccessManagementPage })));
const AdminAccountSecurityPage = lazy(() => import("../admin/pages/AdminAccountSecurityPage").then(module => ({ default: module.AdminAccountSecurityPage })));
const AdminArtistsPage = lazy(() => import("../admin/pages/AdminArtistsPage").then(module => ({ default: module.AdminArtistsPage })));
const AdminArtistFormPage = lazy(() => import("../admin/pages/AdminArtistFormPage").then(module => ({ default: module.AdminArtistFormPage })));
const AdminArtistPreviewPage = lazy(() => import("../admin/pages/AdminArtistPreviewPage").then(module => ({ default: module.AdminArtistPreviewPage })));
const AdminAuditLogPage = lazy(() => import("../admin/pages/AdminAuditLogPage").then(module => ({ default: module.AdminAuditLogPage })));
const AdminAuthenticationHealthPage = lazy(() => import("../admin/pages/AdminAuthenticationHealthPage").then(module => ({ default: module.AdminAuthenticationHealthPage })));
const AdminArtworkCollagePage = lazy(() => import("../admin/pages/AdminArtworkCollagePage").then(module => ({ default: module.AdminArtworkCollagePage })));
const AdminBillingPage = lazy(() => import("../admin/pages/AdminBillingPage").then(module => ({ default: module.AdminBillingPage })));
const AdminActivationPage = lazy(() => import("../admin/pages/AdminActivationPage").then(module => ({ default: module.AdminActivationPage })));
const AdminDashboardPage = lazy(() => import("../admin/pages/AdminDashboardPage").then(module => ({ default: module.AdminDashboardPage })));
const AdminDeploymentPage = lazy(() => import("../admin/pages/AdminDeploymentPage").then(module => ({ default: module.AdminDeploymentPage })));
const AdminDevelopmentSeedsPage = lazy(() => import("../admin/pages/AdminDevelopmentSeedsPage").then(module => ({ default: module.AdminDevelopmentSeedsPage })));
const AdminDistributionPage = lazy(() => import("../admin/pages/AdminDistributionPage").then(module => ({ default: module.AdminDistributionPage })));
const AdminExportsPage = lazy(() => import("../admin/pages/AdminExportsPage").then(module => ({ default: module.AdminExportsPage })));
const AdminCreateExportPage = lazy(() => import("../admin/pages/AdminCreateExportPage").then(module => ({ default: module.AdminCreateExportPage })));
const AdminExportImportCertificationPage = lazy(() => import("../admin/pages/AdminExportImportCertificationPage").then(module => ({ default: module.AdminExportImportCertificationPage })));
const AdminFinalLaunchSignoffPage = lazy(() => import("../admin/pages/AdminFinalLaunchSignoffPage").then(module => ({ default: module.AdminFinalLaunchSignoffPage })));
const AdminExportImportSecurityPage = lazy(() => import("../admin/pages/AdminExportImportSecurityPage").then(module => ({ default: module.AdminExportImportSecurityPage })));
const AdminImportsPage = lazy(() => import("../admin/pages/AdminImportsPage").then(module => ({ default: module.AdminImportsPage })));
const AdminCreateImportPage = lazy(() => import("../admin/pages/AdminCreateImportPage").then(module => ({ default: module.AdminCreateImportPage })));
const AdminTrustedSignersPage = lazy(() => import("../admin/pages/AdminTrustedSignersPage").then(module => ({ default: module.AdminTrustedSignersPage })));
const AdminForgotPasswordPage = lazy(() => import("../admin/pages/AdminForgotPasswordPage").then(module => ({ default: module.AdminForgotPasswordPage })));
const AdminGalleryFormPage = lazy(() => import("../admin/pages/AdminGalleryFormPage").then(module => ({ default: module.AdminGalleryFormPage })));
const AdminGalleryPage = lazy(() => import("../admin/pages/AdminGalleryPage").then(module => ({ default: module.AdminGalleryPage })));
const AdminGalleryPreviewPage = lazy(() => import("../admin/pages/AdminGalleryPreviewPage").then(module => ({ default: module.AdminGalleryPreviewPage })));
const AdminHomepagePage = lazy(() => import("../admin/pages/AdminHomepagePage").then(module => ({ default: module.AdminHomepagePage })));
const AdminHomepagePreviewPage = lazy(() => import("../admin/pages/AdminHomepagePreviewPage").then(module => ({ default: module.AdminHomepagePreviewPage })));
const AdminHomepageSectionFormPage = lazy(() => import("../admin/pages/AdminHomepageSectionFormPage").then(module => ({ default: module.AdminHomepageSectionFormPage })));
const AdminIntelligencePage = lazy(() => import("../admin/pages/AdminIntelligencePage").then(module => ({ default: module.AdminIntelligencePage })));
const AdminLaunchExperiencePage = lazy(() => import("../admin/pages/AdminLaunchExperiencePage").then(module => ({ default: module.AdminLaunchExperiencePage })));
const AdminLaunchInfrastructurePage = lazy(() => import("../admin/pages/AdminLaunchInfrastructurePage").then(module => ({ default: module.AdminLaunchInfrastructurePage })));
const AdminLaunchSecurityRecoveryPage = lazy(() => import("../admin/pages/AdminLaunchSecurityRecoveryPage").then(module => ({ default: module.AdminLaunchSecurityRecoveryPage })));
const AdminLaunchReadinessPage = lazy(() => import("../admin/pages/AdminLaunchReadinessPage").then(module => ({ default: module.AdminLaunchReadinessPage })));
const AdminLoginPage = lazy(() => import("../admin/pages/AdminLoginPage").then(module => ({ default: module.AdminLoginPage })));
const AdminMediaFormPage = lazy(() => import("../admin/pages/AdminMediaFormPage").then(module => ({ default: module.AdminMediaFormPage })));
const AdminMediaPage = lazy(() => import("../admin/pages/AdminMediaPage").then(module => ({ default: module.AdminMediaPage })));
const AdminMediaProcessingPage = lazy(() => import("../admin/pages/AdminMediaProcessingPage").then(module => ({ default: module.AdminMediaProcessingPage })));
const AdminMediaReviewQueuePage = lazy(() => import("../admin/pages/AdminMediaReviewQueuePage").then(module => ({ default: module.AdminMediaReviewQueuePage })));
const AdminMemberEngagementPage = lazy(() => import("../admin/pages/AdminMemberEngagementPage").then(module => ({ default: module.AdminMemberEngagementPage })));
const AdminMemberEcosystemCertificationPage = lazy(() => import("../admin/pages/AdminMemberEcosystemCertificationPage").then(module => ({ default: module.AdminMemberEcosystemCertificationPage })));
const AdminMembersPage = lazy(() => import("../admin/pages/AdminMembersPage").then(module => ({ default: module.AdminMembersPage })));
const AdminMemberExperiencePage = lazy(() => import("../admin/pages/AdminMemberExperiencePage").then(module => ({ default: module.AdminMemberExperiencePage })));
const AdminMetadataFormPage = lazy(() => import("../admin/pages/AdminMetadataFormPage").then(module => ({ default: module.AdminMetadataFormPage })));
const AdminMetadataPreviewPage = lazy(() => import("../admin/pages/AdminMetadataPreviewPage").then(module => ({ default: module.AdminMetadataPreviewPage })));
const AdminObservabilityDashboard = lazy(() => import("../admin/pages/AdminObservabilityDashboard").then(module => ({ default: module.AdminObservabilityDashboard })));
const AdminOperationsPage = lazy(() => import("../admin/pages/AdminOperationsPage").then(module => ({ default: module.AdminOperationsPage })));
const AdminOperationsCertificationPage = lazy(() => import("../admin/pages/AdminOperationsCertificationPage").then(module => ({ default: module.AdminOperationsCertificationPage })));
const AdminProtectedContentPage = lazy(() => import("../admin/pages/AdminProtectedContentPage").then(module => ({ default: module.AdminProtectedContentPage })));
const AdminReleaseFormPage = lazy(() => import("../admin/pages/AdminReleaseFormPage").then(module => ({ default: module.AdminReleaseFormPage })));
const AdminReleasePreviewPage = lazy(() => import("../admin/pages/AdminReleasePreviewPage").then(module => ({ default: module.AdminReleasePreviewPage })));
const AdminReleasesPage = lazy(() => import("../admin/pages/AdminReleasesPage").then(module => ({ default: module.AdminReleasesPage })));
const AdminResetPasswordPage = lazy(() => import("../admin/pages/AdminResetPasswordPage").then(module => ({ default: module.AdminResetPasswordPage })));
const AdminSeoPage = lazy(() => import("../admin/pages/AdminSeoPage").then(module => ({ default: module.AdminSeoPage })));
const AdminSettingsPage = lazy(() => import("../admin/pages/AdminSettingsPage").then(module => ({ default: module.AdminSettingsPage })));
const AdminUsersPage = lazy(() => import("../admin/pages/AdminUsersPage").then(module => ({ default: module.AdminUsersPage })));

export function AdminAppRoutes() {
  const location = useLocation();
  return (
      <Suspense fallback={<PublicPageLoader />}>
        <AdminAuthProvider>
          <AdminRouteErrorBoundary routeKey={location.pathname}>
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
              <Route path="production" element={<RequirePermission permission="releases.read"><AdminProductionWorkspacePage /></RequirePermission>} />
              <Route path="agents" element={<RequirePermission permission="operations.read"><AdminAgentStatusPage /></RequirePermission>} />
              <Route path="production/:releaseId" element={<RequirePermission permission="releases.read"><AdminProductionWorkspacePage /></RequirePermission>} />
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
          </AdminRouteErrorBoundary>
        </AdminAuthProvider>
      </Suspense>
    );
}
