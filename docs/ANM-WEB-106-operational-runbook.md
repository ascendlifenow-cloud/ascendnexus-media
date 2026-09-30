# ANM-WEB-106 Operational Runbook

## Failed Release Workflow

1. Open `/admin/operations`.
2. Review failed or paused workflows.
3. Open release verification details.
4. Fix the blocking content, media, metadata, SEO, cache, or public-delivery issue.
5. Re-run QA.
6. Resume or transition the workflow only after checks pass.

## Calendar Issue

Verify the event exists in `/admin/release-calendar`. If a workflow was scheduled but no event exists, create a calendar event and confirm the workflow state.

## Campaign Issue

Social/newsletter campaigns are schedule records until provider execution is configured. Confirm campaign status, channels, generated content, and compliance review before enabling provider sends.

## Content Health Warning

Run `npm run operations:content-health -- --json` and review open recommendations. Fix high-severity recommendations before large release batches.

## Report Generation

Run `npm run operations:report -- --period=daily --json` or use the Daily Report action in `/admin/operations`.

## Automation Pause

Automation pauses on required failed steps. Do not force completion. Resolve the recorded blocker and run release verification again.
