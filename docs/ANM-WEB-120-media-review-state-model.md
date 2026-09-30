# ANM-WEB-120 Media Review State Model

The UI maps existing review records into display states through `mediaReviewStateMapper`.

Mapped display states:

- unreviewed
- reviewing
- classification_required
- match_required
- assignment_required
- processing
- ready_to_complete
- assigned
- completed
- rejected
- quarantined
- failed

Operation states:

- idle
- validating
- saving
- assigning
- approving
- rejecting
- quarantining
- retrying
- completing
- success
- error

Backend review state remains authoritative where available. The current implementation persists assignment outcomes through the existing media assignment service.
