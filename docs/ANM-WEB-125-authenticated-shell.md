# ANM-WEB-125 Authenticated Shell

The authenticated shell now uses one identity-aware transition point between Guest and Member experiences. Anonymous visitors receive the public shell, Guest Access badge, Join/Login actions, and public routes. Authenticated members receive the member shell, Dashboard-first navigation, member identity chip, membership chip, and member route aliases for Home, Artists, Songs, and Artwork.

Public routes that should no longer keep members in guest mode redirect to member equivalents:

- `/` -> `/member/home`
- `/artists` -> `/member/artists`
- `/artists/:slug` -> `/member/artists/:slug`
- `/songs` and `/releases` -> `/member/songs`
- `/songs/:slug` and `/releases/:slug` -> `/member/songs/:slug`
- `/artwork` and `/artwork-collage` -> `/member/artwork`

Admin routes remain isolated under the admin authentication provider and are not treated as member sessions.
