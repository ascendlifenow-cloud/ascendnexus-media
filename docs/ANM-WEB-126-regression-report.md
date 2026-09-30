# ANM-WEB-126 Regression Report

## Regression Commands Run

- `npm run build`
- `npm run test:member-auth`
- `ADMIN_SMOKE_PASSWORD=<redacted> npm run admin:login-smoke-test -- --email=superadmin@ascendnexus.local`
- `npm run public-api:verify`
- `npm run publication:verify`
- `npm run storage:health`
- `npm run media-intake:health`

## Result

Build, member auth, admin auth, public API, publication, and storage checks passed locally.

`media-intake:health` passed structurally but reported the watcher disabled when the script was not run with `MEDIA_INTAKE_ENABLED=true`. The running dev server was restarted with `MEDIA_INTAKE_ENABLED=true`, and `/api/admin/launch-readiness` reported media intake enabled.

## Known Runtime Notes

- `npm run publication:verify` needed escalated execution because sandboxed local port binding failed with `listen EPERM`.
- Vite emitted an existing large-chunk warning after build; it did not fail the build.
- Localhost `curl` probes intermittently required unsandboxed execution because the sandbox returned `Operation not permitted`.

## Regression Decision

No local regression was found that prevents the application from running. Final launch remains blocked by production email delivery verification.
