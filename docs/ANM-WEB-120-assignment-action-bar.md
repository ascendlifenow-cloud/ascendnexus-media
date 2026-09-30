# ANM-WEB-120 Assignment Action Bar

The `AssignmentActionBar` is the single review-decision surface at the top of the Media Review panel.

It displays:

- Current review state
- Assignment target summary
- Validation state
- Unsaved-change state
- Operation state
- Primary action
- Secondary actions
- Close control

Primary action behavior:

- Failed item: Retry
- Assigned item: Complete Review
- Other active items: Assign Asset

Secondary actions include Assign & Complete, Ignore, and Archive. Final successful operations close the panel. Failed operations leave the panel open and show a safe error.
