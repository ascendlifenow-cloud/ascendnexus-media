# ANM-WEB-122 Release Publish Readiness Panel

Publish readiness now opens in a right-side drawer controlled by `?panel=publish-readiness`.

The drawer contains:

- Sticky Release Action Bar.
- Readiness summary and detailed checks.
- Validation blockers and warnings.
- Draft Release Preview.
- Publication impact summary.

`?section=preview` and `?section=history` open the panel to the matching section. Browser back closes the panel because opening the panel pushes URL state.

The release form remains mounted while the drawer opens and closes, so unsaved form edits are preserved.

Manual close prompts when unsaved changes exist. Successful final operations close the panel only after backend confirmation and release query refresh.

