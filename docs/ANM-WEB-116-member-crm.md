# ANM-WEB-116 Member CRM

The Member CRM is the administrative operating surface for public member identity, lifecycle, engagement, support, risk, sessions, and customer-success visibility. It uses the member identity system from ANM-WEB-111, centralized access and membership state from ANM-WEB-112, protected-content controls from ANM-WEB-113, member portal state from ANM-WEB-114, and engagement records from ANM-WEB-115.

## Architecture

- Backend source of truth: `memberAccounts`, `memberSessions`, membership assignments, engagement collections, security events, audit events, support notes, account flags, and moderation records.
- API surface: `/api/admin/member-crm`, `/api/admin/member-search`, `/api/admin/member-health`, `/api/admin/member-reports`, `/api/admin/members/:memberId`, and scoped member subroutes.
- Admin surface: `/admin/members`, `/admin/member-search`, `/admin/member-activity`, `/admin/member-security`, `/admin/member-health`, `/admin/member-support`, `/admin/member-notifications`, `/admin/member-subscriptions`, `/admin/member-entitlements`, `/admin/member-sessions`, `/admin/member-risk`, and `/admin/member-moderation`.
- Services: `MemberSearchService`, `MemberAdministrationService`, `MemberCrmService`, `MemberHealthService`, `MemberRiskService`, `MemberSupportService`, `MemberModerationService`, `MemberSessionAdministrationService`, `MemberTimelineService`, and `MemberSuccessService`.

## Data Safety

The CRM intentionally exposes member identity to authorized administrators with `users.read` or `users.manage`. Verification output redacts email and never prints protected media URLs, signed URLs, private object keys, authorization references, download URLs, or storage paths.

## Readiness Boundaries

Billing-provider subscription operations remain readiness-only until ANM-WEB-117. The CRM can show and manually grant membership tiers, but it does not represent payment success or synchronize external billing state.

