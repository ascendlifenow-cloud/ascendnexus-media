# ANM-WEB-116 Member Support

Member support tools provide internal notes and escalation context for customer-success workflows.

## Support Notes

Support notes are internal-only records with a subject, body, status, creator, and timestamps. They are visible from member detail and included in the member timeline.

Supported statuses:

- `open`
- `pending`
- `resolved`
- `escalated`

## Rules

- Support notes must not be exposed to public or member APIs.
- Notes should avoid secrets, payment credentials, raw tokens, private media URLs, or contact-message bodies beyond the support context needed to resolve the case.
- Status and escalation changes should be auditable.

