# ANM-WEB-107 Distribution Engine

ANM-WEB-107 adds the media distribution backbone for Ascend Nexus Media. The engine creates durable distribution jobs, plans media transformations, builds platform metadata, uploads through connectors, verifies uploads, stores platform IDs/URLs, retries retryable failures, collects analytics baselines, and records distribution audit events.

## Pipeline

The default pipeline is:

1. Validate Asset
2. Verify Rights
3. Verify Publication Status
4. Verify Artwork
5. Verify Metadata
6. Verify SEO
7. Generate Platform Metadata
8. Generate Platform Images
9. Generate Captions
10. Generate Hashtags
11. Generate Descriptions
12. Generate Titles
13. Generate Thumbnails
14. Generate Social Variants
15. Upload
16. Verify Upload
17. Store Platform IDs
18. Monitor Status
19. Retry Failures
20. Record Analytics Baseline
21. Complete Distribution

## Admin APIs

- `GET /api/admin/distribution/overview`
- `GET/POST /api/admin/distribution/jobs`
- `POST /api/admin/distribution/jobs/:distributionJobId/run`
- `POST /api/admin/distribution/retry`
- `GET /api/admin/distribution/connectors`
- `GET /api/admin/distribution/queues`
- `GET/POST /api/admin/distribution/analytics`
- `GET /api/admin/distribution/history`

## CLI

- `npm run distribution:health`
- `npm run distribution:verify`
- `npm run distribution:connectors`
- `npm run distribution:queues`
- `npm run distribution:retry`
- `npm run distribution:analytics`
- `npm run distribution:history`

External connector uploads are disabled until provider credentials and platform policies are configured.
