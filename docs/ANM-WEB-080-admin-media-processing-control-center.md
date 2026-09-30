# ANM-WEB-080 Admin Media Processing Control Center

## Overview

The Admin Media Processing Control Center lives at `/admin/media/processing`. It gives admins a consolidated view of media processing jobs, queue health, worker readiness, asset processing summaries, retry/cancel controls, and queue pause/resume readiness.

## Frontend Structure

- Page: `src/admin/pages/AdminMediaProcessingPage.tsx`
- Admin service: `src/admin/services/AdminMediaProcessingService.ts`
- Admin hooks:
  - `useAdminMediaProcessing`
  - `useAdminProcessingFilters`
  - `useSelectedProcessingJob`
  - `useAssetProcessingSummary`
- Utilities: `src/admin/utils/mediaProcessingAdminUtils.ts`
- Components: `src/admin/components/media/processing/*`

The page polls every 8 seconds when active jobs exist and every 30 seconds otherwise. Polling is skipped while the document is hidden.

## Admin Actions

- Retry failed/dead-letter jobs when retry limits allow it.
- Cancel queued/delayed/retrying jobs.
- Protect required active jobs from cancellation.
- Pause or resume individual queues.
- Open the selected asset record in the Media Library.

## Public Safety

The job detail panel only displays safe job metadata. Secret-like keys and URL-like fields are redacted before rendering. Job output inspection shows readiness and basic file facts without exposing signed URLs, storage secrets, private media URLs, or raw stack traces.

## Backend Integration

The admin processing controller exposes:

- `GET /api/admin/media/processing/jobs`
- `GET /api/admin/media/processing/jobs/:processingJobId`
- `POST /api/admin/media/processing/jobs/:processingJobId/retry`
- `POST /api/admin/media/processing/jobs/:processingJobId/cancel`
- `GET /api/admin/media/processing/health`
- `POST /api/admin/media/processing/queues/:queueName/pause`
- `POST /api/admin/media/processing/queues/:queueName/resume`
- `GET /api/admin/media/assets/:assetId/processing`

Admin-triggered retry, cancel, queue pause/resume, and health-check actions record audit events through `MediaAuditPersistenceService`.

## Verification

Run:

```bash
npm run typecheck
npm run test:admin-media-processing
npm run test:media-processing
npm run build
```
