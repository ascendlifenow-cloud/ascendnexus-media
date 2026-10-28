# Media Review Badge Synchronization

The navigation badge previously fetched its count once when the sidebar mounted. It now listens for counts published by the shared review service after queue rebuilds and mutations. Counts include pending and in-review items from the complete queue, before page filters.

Assignments from review, pickers, and Media Library resolve the corresponding cached review item and publish the count. Archive, ignore, delete and bulk operations publish after their state changes. Explicit refreshes also publish. Window focus refreshes authoritative state, without polling or fetching again on count events. Listeners are removed on unmount; network failures preserve the last known count.

Validation: `node --import tsx scripts/media-review-count-test.ts` covers 13-to-9 assignments, in-review inclusion, resolved/ignored/archived exclusion, deletion, notification and unsubscribe behavior. Application TypeScript and production build passed. Authenticated browser assignment interaction still requires user verification in staging; no member or catalog records were changed for this fix.
