# Ascend Nexus Media Staging Deployment Checklist

## GitHub

- Repository: `ascendlifenow-cloud/ascendnexus-media`
- Branch: `main`
- Require successful build checks before production deployment.
- Keep runtime databases, media, exports, and secrets outside Git.

## Cloudflare

- Create Pages project from the GitHub repository.
- Build command: `npm run build`
- Build output: `dist`
- Staging domain: `staging.ascendnexusmedia.com`
- Create private R2 bucket: `anm-media-staging`
- Create public-media custom domain: `staging-media.ascendnexusmedia.com`
- Keep the bucket private by default; expose only the `public/` delivery path.
- Configure browser upload CORS for `https://staging.ascendnexusmedia.com`.

### Pages build variables

```text
VITE_APP_NAME=Ascend Nexus Media
VITE_PUBLIC_SITE_URL=https://staging.ascendnexusmedia.com
VITE_PUBLIC_API_BASE_URL=https://api-staging.ascendnexusmedia.com/api/public
VITE_MEDIA_UPLOAD_API_BASE_URL=https://api-staging.ascendnexusmedia.com
VITE_API_URL=https://api-staging.ascendnexusmedia.com
VITE_MEDIA_STORAGE_PROVIDER=custom
VITE_MEDIA_MOCK_UPLOADS=false
VITE_MEDIA_CDN_BASE_URL=https://staging-media.ascendnexusmedia.com
VITE_PUBLIC_API_SEED_FALLBACK_ENABLED=false
```

Do not configure `VITE_MEDIA_ADMIN_DEV_TOKEN` in staging or production.

## MongoDB Atlas

- Create a staging deployment in the same general region as Render.
- Database name: `ascend_nexus_media_staging`
- Create a dedicated staging application user.
- Store the connection string only in Render as `MONGODB_URI`.
- Apply schema migrations and indexes before importing content.
- Confirm backup/restore behavior before production cutover.

## Render

- Create a Blueprint from `render.yaml`.
- Provide `MONGODB_URI` when prompted.
- Provide the R2 endpoint, access key ID, and secret access key when prompted.
- Add custom API domain: `api-staging.ascendnexusmedia.com`.
- Confirm `/health/live` returns 200.
- Confirm `/health/ready` returns 200 after MongoDB, Redis, and R2 are connected.
- Confirm the media worker remains healthy and consumes BullMQ jobs.

## DNS and TLS

- Attach `staging.ascendnexusmedia.com` to Cloudflare Pages.
- Point `api-staging.ascendnexusmedia.com` to the Render custom-domain target.
- Attach `staging-media.ascendnexusmedia.com` to the approved public R2 delivery path.
- Use Cloudflare Full (strict) TLS.
- Do not cache authenticated API, admin, member, or protected-media responses.

## Staging Gate

- Import staging data and media with checksums.
- Bootstrap a staging-only super administrator.
- Verify public, member, and admin login flows.
- Verify artwork upload, audio upload, preview generation, assignment, and publication.
- Verify public URLs and protected media separation.
- Verify direct route refreshes, search, sitemap, and SEO metadata.
- Run security, accessibility, and production build checks.
- Complete backup and restore rehearsal.
