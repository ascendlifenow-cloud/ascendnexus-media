# ANM-WEB-107 Platform Connectors

The connector framework defines:

- `authenticate`
- `validate`
- `upload`
- `verify`
- `update`
- `delete`
- `retry`
- `fetchAnalytics`
- `healthCheck`
- `rateLimitStatus`

Local/public connectors include website, homepage, artist pages, release pages, gallery, RSS feed, search index, SEO index, newsletter, and email campaigns.

External connectors are registered for YouTube, YouTube Shorts, Instagram, Instagram Reels, Facebook, Threads, TikTok, Spotify, Apple Music, Amazon Music, SoundCloud, Bandcamp, Discord, Patreon, X, Pinterest, Mastodon, podcast platforms, and future platforms.

External connectors report `needs_configuration` until credentials, API quotas, consent/compliance constraints, and platform approval are configured. This prevents fake uploads and false platform IDs.
