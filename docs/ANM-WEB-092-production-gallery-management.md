# ANM-WEB-092 Production Gallery Management

## Architecture

Gallery management now uses authenticated backend APIs backed by the production persistence layer instead of seed-only frontend state.

- Admin API: `/api/admin/gallery`
- Public API: `/api/public/gallery`
- Repository: `GalleryRepository`
- Service: `AdminGalleryService`
- Public delivery: `PublicGalleryDeliveryService`
- Frontend client: `ApiBackedAdminGalleryService`

The frontend keeps the existing `PublicGalleryItem` shape for compatibility, while server records retain lifecycle fields such as `publicationState`, `publicVisibility`, `schemaVersion`, and metadata-based readiness flags.

## Lifecycle

Supported content statuses:

- `draft`
- `published`
- `archived`
- `deleted`

Supported publication states:

- `draft`
- `ready_to_publish`
- `published`
- `archived`

Publishing requires a valid title, slug, source association, supported image media type, public-safe image URL, and alt text unless the item is marked decorative. Archive, unpublish, and restore immediately remove public visibility.

## Source Policy

Standalone/custom gallery items can publish independently. Artist-linked gallery items require the artist source to exist and be active/published before public delivery. Release-linked items require the release to exist and be published.

Invalid combinations are rejected, including artist sources without matching `artistId`/`sourceId`, release sources without matching `releaseId`/`sourceId`, and deleted source records.

## Media Policy

Launch support is image-first:

- `image`
- `cover_art`
- `artist_profile`
- `promo_graphic`
- `video_thumbnail`
- `custom`

The admin form uploads gallery images through the production media upload system with private/admin-only draft access. Signed URLs and raw storage paths are not copied into gallery form state. Public delivery only returns URLs that pass public-safe filtering.

## Ordering

Gallery order is persisted through:

`POST /api/admin/gallery/reorder`

The route validates IDs, rejects duplicates, updates `sortOrder`, records audit history, and invalidates public gallery/homepage/search/browse caches.

## Admin UI

The admin gallery list now uses API-backed data and real lifecycle mutations:

- Create/edit draft gallery item
- Publish/unpublish
- Archive/restore
- Open public item only when published
- Save current order
- Keyboard-accessible move selected up/down
- Refresh persisted data

The older generic mock publishing action buttons were removed from the gallery form page. The sticky action bar now calls the real gallery API mutations.

## Public Delivery

Public gallery delivery now reads persisted gallery records and filters out:

- draft items
- archived/deleted items
- unpublished publication states
- records with non-public visibility
- private/signed URLs
- artist-linked items whose artist is not public
- release-linked items whose release is not public

## Known Limitations

Drag-and-drop ordering is not implemented yet; keyboard/order-save controls are implemented and persisted. Live staging verification of uploaded gallery image promotion, CDN URLs, and browser E2E remains required because this local environment does not have production MongoDB, R2/CDN, Redis/workers, or staging credentials configured.
