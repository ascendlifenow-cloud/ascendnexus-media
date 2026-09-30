# ANM-WEB-123 Release Export Import

Release exports preserve release core records, artist relationship, slug, status, publication state representation, metadata, cover/preview/full-song asset references, and active media assignments. Related artist records are included when needed to preserve relationship integrity.

Release imports default to draft and do not publish imported routes automatically. Slug and artist/title conflicts are detected during dry-run.
