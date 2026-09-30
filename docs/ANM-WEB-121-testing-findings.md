# ANM-WEB-121 Testing Findings

Prompt: Functional Updates After Testing — Artist Release Dashboard, Release Form Workflow & Media Picker Standardization.

## Findings Addressed

- The admin dashboard did not provide a roster-first view of active artists and their release progress.
- Release creation started with identity fields before artist assignment, which made the flow feel backwards for song creation.
- Release slug generation depended on the form hook only when the slug was empty and did not clearly preserve or regenerate manual edits.
- Release media fields placed upload controls before media-library selection, even though operators often need to reuse already ingested assets.
- Audio Preview appeared before Full Song Audio, which made the generated 30-second preview workflow harder to discover.
- Artist visual asset fields used a different upload-first pattern from release cover art.
- Release public actions used hardcoded song links and public lookup only matched exact slugs, causing valid published records with ID-based links or inconsistent slug data to show Song Not Found.

## Local Verification

- `npm run typecheck` passed.
- `npm run build` passed.

## Production Verification Status

Production verification has not been run. Required browser checks:

- Open `/admin` and confirm Artist Release Overview renders.
- Expand artists and verify Published Songs and In Progress Songs are accurate.
- Create a release and confirm Artist Assignment appears first.
- Enter a title and confirm slug generation, manual preservation, and Regenerate behavior.
- Confirm Release media sections show Media Asset Picker, Upload Box, then linked/selected file details.
- Confirm Edit Artist visual asset sections use the same picker/upload/linked layout.
- Confirm release Public/View actions resolve to an actual public page for published records.
