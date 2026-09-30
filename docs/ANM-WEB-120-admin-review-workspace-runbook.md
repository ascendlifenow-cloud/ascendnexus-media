# ANM-WEB-120 Admin Review Workspace Runbook

## Sidebar Does Not Expand

Run `npm run typecheck`, reload the admin page, and clear the local storage key `anm.admin.sidebar.mode` if preference state is corrupt.

## Navigation Item Missing

Check `AdminNavigationRegistry` for route metadata and verify the signed-in admin has the required permission.

## Media Review Badge Incorrect

Refresh the Media Review queue. Badge counts are loaded from the existing review queue service and update after page reload or review refresh.

## Review Panel Does Not Open

Verify the selected item exists in the active queue and confirm the URL contains `?review=<reviewItemId>`.

## Action State Is Stale

Use Refresh Queue. If another reviewer changed the asset, reload the latest queue state before continuing.

## Assignment Succeeds But Queue Does Not Update

Run typecheck and inspect the browser console. The page refreshes the queue after assignment through `useMediaAssignmentReviewQueue`.

## Panel Closes On Failure

This is a regression. Failed operations must keep the panel open and show the safe error in `AssignmentActionBar`.

## Completed Item Remains In Needs Review

Refresh the queue and verify the asset metadata has `assignmentReviewStatus=resolved` or `assignmentStatus=kept_unassigned`.

## Mobile Panel Unusable

Test at 375px and verify the panel uses full width with the action bar visible.

## Verification Commands

```bash
npm run typecheck
npm run build
```
