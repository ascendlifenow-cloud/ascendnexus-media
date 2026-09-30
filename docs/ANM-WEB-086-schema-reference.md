# ANM-WEB-086 Schema Reference

| Collection | Model | Application ID | Sensitive Fields | Public Exposure |
|---|---|---|---|---|
| `admin_users` | `AdminUser` | `userId` | `passwordHash` | Never public |
| `admin_sessions` | `AdminSession` | `sessionId` | `tokenHash`, IP/user-agent hashes | Never public |
| `admin_roles` | `AdminRole` | `roleId` | none | Admin only |
| `password_reset_tokens` | `PasswordResetToken` | `resetTokenId` | `tokenHash` | Never public |
| `artists` | `ArtistRecord` | `artistId` | admin metadata | Public only when active, published, visible |
| `song_releases` | `SongReleaseRecord` | `releaseId` | protected full-song refs in metadata | Public only when published, published-state, visible |
| `media_assets` | `MediaAssetRecord` | `assetId` | private URLs, signed URLs, provider metadata | Public only when public-safe |
| `media_storage_objects` | `MediaStorageObjectRecord` | `storageObjectId` | storage paths for private objects, signed URLs | Public URL only for public objects |
| `media_asset_links` | `MediaAssetLinkRecord` | `linkId` | admin metadata | Admin only |
| `media_asset_versions` | `MediaAssetVersionRecord` | `versionId` | private version metadata | Admin only unless active public URL is safe |
| `media_upload_jobs` | `MediaUploadJob` | `uploadJobId` | validation internals | Admin only |
| `direct_media_upload_sessions` | `DirectMediaUploadSession` | `uploadSessionId` | multipart IDs, no signed URLs persisted | Admin only |
| `media_processing_jobs` | `MediaProcessingJobRecord` | `processingJobId` | sanitized errors only | Admin only |
| `media_publication_operations` | `MediaPublicationOperationRecord` | `publicationOperationId` | operational metadata | Admin only |
| `media_publication_stages` | `MediaPublicationStageRecord` | `stageId` | operational metadata | Admin only |
| `media_publication_locks` | `MediaPublicationLockRecord` | `lockId` | none | Admin only |
| `gallery_items` | `GalleryItemRecord` | `galleryItemId` | admin metadata | Public only when published and visible |
| `homepage_configurations` | `HomepageConfigurationRecord` | `homepageConfigId` | admin metadata | Public published version only |
| `site_configurations` | `SiteConfigurationRecord` | `siteConfigId` | no secrets allowed | Public published version only |
| `seo_metadata` | `SeoMetadataRecord` | `seoMetadataId` | structured/admin metadata | Public published records only |
| `social_metadata` | `SocialMetadataRecord` | `socialMetadataId` | admin metadata | Public published records only |
| `published_content_sync_statuses` | `PublishedContentSyncStatusRecord` | `syncStatusId` | operational metadata | Admin health only |
| `admin_audit_events` | `AdminAuditEventRecord` | `auditEventId` | sanitized snapshots | Admin only |
| `contact_submissions` | `ContactSubmissionRecord` | `contactSubmissionId` | message, notes, IP/user-agent hash | Admin only |
| `newsletter_subscriptions` | `NewsletterSubscriptionRecord` | `subscriptionId` | token hashes | Admin only |
| `email_delivery_records` | `EmailDeliveryRecord` | `emailDeliveryId` | recipient hash, provider message metadata | Admin only |
| `database_migrations` | `DatabaseMigrationRecord` | `migrationId` | sanitized errors | Admin/system only |
| `database_migration_locks` | `DatabaseMigrationLock` | `lockId` | none | Admin/system only |

Index definitions live in `server/database/collectionRegistry.ts`.

Public serializers must remove Mongo `_id`, passwords, token hashes, signed URLs, secret-looking metadata, and private storage details.
