# ANM-WEB-088 Processing Operations Runbook

## Redis Outage

Impact: production workers cannot consume durable queues.

Actions:

- Run `npm run media:processing:health`.
- Confirm `REDIS_URL` and `REDIS_PREFIX`.
- Restart worker processes after Redis is healthy.
- Run `npm run media:processing:recover-stalled`.
- Retry failed jobs only after queue health is normal.

## Worker Outage

Impact: uploads remain queued and publication may wait for processing.

Actions:

- Check admin processing health.
- Restart the affected worker command, such as `npm run media:worker:image`.
- Review dead-letter jobs.
- Run recovery scan for stale active jobs.

## Image Job Failure

Actions:

- Confirm image processor health.
- Verify source storage object exists.
- Review job output errors.
- Retry transient failures.
- Replace unsupported/corrupt source files.

## Audio Job Failure

Actions:

- Confirm FFprobe/FFmpeg availability.
- Verify source object and format.
- Retry transient storage/tool failures.
- Treat corrupt or unsupported audio as permanent until the source is replaced.

## Stuck Jobs

Actions:

- Run `npm run media:processing:recover-stalled`.
- Review stalled job IDs in admin.
- Recover queued jobs only after worker inactivity is confirmed.

## Dead-Letter Review

Actions:

- Open admin processing dead-letter view.
- Required jobs must be retried after fixing the underlying issue.
- Optional jobs may be dismissed only with a clear reason.

## Queue Pause And Resume

Use admin queue controls or the processing API. Pause queues before maintenance; resume after storage, tools, and Redis are healthy.

## Disk Or Temp Incident

Actions:

- Run `npm run media:processing:cleanup-temp`.
- Confirm temp root is outside public directories.
- Check free disk space before resuming workers.

## Full-Song Privacy Incident

Actions:

- Run `npm run storage:verify-full-song-privacy`.
- Block publication for affected assets.
- Move violating processing jobs to dead letter.
- Remove any public output references.
- Preserve audit evidence.

## Graceful Shutdown

Worker processes should stop accepting new jobs, finish active work within timeout, clean temp files, close queue resources, and exit with a clear status.

## Verification After Recovery

- `npm run media:processing:health`
- `npm run test:media-processing`
- `npm run storage:verify-full-song-privacy`
- `npm run test:media-publication`
