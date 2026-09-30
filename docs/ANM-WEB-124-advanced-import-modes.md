# ANM-WEB-124 Advanced Import Modes

Create-only remains the default and imports as draft.

Merge mode is additive:
- Artist aliases are unioned.
- New records are imported as draft.
- Release metadata is marked as imported draft availability.
- Media assets are added only when absent.
- Media relationships are appended only when unique.

Replace-selected is guarded:
- Requires `imports.replace_selected`.
- Requires explicit `replaceScope`.
- Fails closed without scope.

Restore is guarded:
- Requires `imports.restore`.
- Requires a restore plan.
- Fails closed without a restore plan.

Publication preservation fails closed unless verification is explicitly satisfied.
