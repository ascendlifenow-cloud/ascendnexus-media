# ANM-WEB-123 Artist Export Import

Artist exports serialize artist records using envelopes and include referenced media asset IDs discovered from artist metadata, ownership, and active media assignments. Optional release inclusion pulls related releases into the dependency graph.

Artist imports default to draft state and disabled public visibility. Identity conflicts are detected by source ID, slug, and display name during dry-run.
