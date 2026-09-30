# ANM-WEB-115 Playlists

Members can create private playlists and add safe resource references to them.

Implemented:

- Create playlist
- Rename/update playlist
- Delete playlist
- Add playlist item
- Private visibility by default
- Public/shared/collaborative readiness fields

Security:

- Playlist ID operations require ownership by the current member.
- Playlist records do not contain protected media URLs.
- Streaming and downloads remain separately authorized through ANM-WEB-113.
