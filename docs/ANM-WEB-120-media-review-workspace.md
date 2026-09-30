# ANM-WEB-120 Media Review Workspace

## Route

The workspace is available at `/admin/media-review`. The previous `/admin/media/review` route remains active for compatibility.

## Workspace Model

The Media Review page keeps the queue mounted and opens selected items in a right-side sliding panel. Selection is encoded as:

```text
/admin/media-review?review=<reviewItemId>
```

Direct refresh reselects the matching item after the queue loads.

## Queue

Queue cards now have a clearer primary stateful action. Final and potentially destructive review decisions are centralized in the panel action bar.

## Sliding Panel

The panel includes:

- Sticky assignment action bar
- Item identity header
- Media preview and technical metadata
- Visibility and review state
- Suggested assignment
- Assignment form
- Validation details

Escape closes the panel. Unsaved assignment edits prompt before closing.

## Query Synchronization

Existing queue refresh behavior remains in place after assignment, ignore, archive, and retry actions. Successful final operations clear the selection and close the panel.

## Known Limitation

The current implementation reuses the existing Media Assignment Review service. Dedicated backend `/api/admin/media-review/*` endpoints and optimistic record-version checks remain production hardening work.
