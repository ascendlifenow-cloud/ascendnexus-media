# ANM-WEB-122 Release Action State Model

Action operation states:

- `idle`
- `validating`
- `saving`
- `publishing`
- `republishing`
- `archiving`
- `previewing`
- `cancelling`
- `success`
- `error`

Button labels transition through running and success states, for example:

- Save Draft -> Saving Draft -> Draft Saved
- Save Changes -> Saving Changes -> Changes Saved
- Save & Republish -> Republishing -> Republished
- Archive -> Archiving -> Archived
- Preview Release -> Preparing Preview -> Preview Ready

Conflicting actions are disabled while an operation is active. Failed actions leave the drawer open and expose a safe error message.

Backend mutation success is required before success state is shown for save, publish, and archive actions.

