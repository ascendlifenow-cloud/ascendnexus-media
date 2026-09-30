# ANM-WEB-121 Release Form Updates

## Workflow Order

The release form now places Artist Assignment before Release Identity so operators start by selecting the artist context before title, slug, and song identifiers.

## Slug Behavior

- New releases auto-generate a slug from the title while slug mode remains automatic.
- Manual slug edits are normalized and preserved.
- The Regenerate action rebuilds the slug from the current title and returns the field to auto mode.
- Existing releases default to manual slug mode to avoid accidental URL changes.

## Media Field Order

Release media fields now follow the same operational sequence:

1. Media Asset Picker
2. Upload Box
3. Linked or selected asset summary

Full Song Audio is displayed before Audio Preview so operators can upload or select the source song first, then generate or manually select a 30-second preview.

## Public Link Fix

Admin release actions now use a canonical route helper. Public release lookup accepts published records by slug, song ID, or release ID, reducing false Song Not Found states for legacy or partially normalized data.
