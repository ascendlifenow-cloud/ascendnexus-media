# ANM-WEB-116 Member Risk

The member risk engine produces a bounded, explainable operational risk score for administrative review. It does not make automated billing, legal, or irreversible account decisions.

## Inputs

- Repeated failed-login and credential/security events
- Active session count
- Active account flags
- Active moderation records
- Suspended account status

## Outputs

- Numeric score from 0 to 100
- Risk level: `low`, `medium`, `high`, or `critical`
- Counted contributing signals
- Checked timestamp

## Operator Guidance

High or critical risk should be reviewed with member support history, recent sessions, security events, and moderation history before taking action. Emergency access restrictions should use the moderation and access-control systems, not ad hoc frontend hiding.

