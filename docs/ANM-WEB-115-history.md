# ANM-WEB-115 History

Listening and viewing history are stored as private member-owned records.

Listening history tracks:

- Played, resumed, completed, and skipped events
- Last position
- Duration
- Listened seconds
- Web playback device category

Viewing history tracks member views for artists, releases, galleries, videos, and collections.

Continue listening is derived server-side from incomplete playback history and is exposed through `/api/member/recent` and the member dashboard.
