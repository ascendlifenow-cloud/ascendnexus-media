# ANM-WEB-120 Admin Navigation

## Architecture

Admin navigation now renders from `AdminNavigationRegistry`, grouped by `adminNavigationGroups`. The legacy `adminNavItems` export maps from the registry so older components do not maintain a second route list.

## Groups

- Overview: Dashboard, Operations
- Content: Artists, Releases, Gallery, Homepage
- Media Operations: Media Library, Media Review, Media Processing
- Publishing: Publication Queue, Release Calendar, Distribution, SEO
- Members: Members, Membership Tiers, Entitlements, Member Experience, Billing
- System: Observability, Deployment, Security, Audit Log, Admin Users, Intelligence, Dev Seeds, Settings

## Sidebar Modes

The sidebar supports `expanded` and `collapsed`.

- Expanded mode shows labels, group headers, badges, and account context.
- Collapsed mode shows a compact icon rail with accessible labels, active markers, group separators, and hover/focus tooltips.

The preference persists through `AdminSidebarPreferenceService` using local storage as the current development fallback.

## Badges

Media Review supports a needs-review count badge. Counts are bounded in the UI and hidden when zero.

## Responsive Behavior

Desktop uses the persisted sidebar width. Mobile keeps the existing overlay drawer and renders the sidebar expanded for clarity.
