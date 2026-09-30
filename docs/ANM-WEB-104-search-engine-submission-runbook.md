# ANM-WEB-104 Search Engine Submission Runbook

## Preconditions

- ANM-WEB-103 production launch gate is approved.
- `PUBLIC_APP_BASE_URL` is the final HTTPS production domain.
- `/robots.txt` allows public crawling in production.
- `/sitemap.xml` and scoped sitemap files return XML from the production host.
- `npm run seo:indexing-launch-gate -- --environment=production --json` returns an approved decision.

## Google Search Console

1. Add the production domain property.
2. Verify ownership using DNS TXT or another approved method.
3. Record the safe verification reference in the search-engine verification records.
4. Submit `https://<production-domain>/sitemap.xml`.
5. Inspect representative homepage, artist, release, and gallery URLs.

## Bing Webmaster Tools

1. Add the production site.
2. Verify ownership.
3. Submit `https://<production-domain>/sitemap.xml`.
4. Confirm crawl discovery for published artist, release, and gallery URLs.

## Validation

Run:

```bash
npm run seo:health -- --environment=production --json
npm run seo:sitemap-verify -- --environment=production --json
npm run seo:robots-verify -- --environment=production --json
npm run seo:search-engine-verify -- --json
```

Do not request indexing when any command reports blockers.
