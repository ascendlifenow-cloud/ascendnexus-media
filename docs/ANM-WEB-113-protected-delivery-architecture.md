# ANM-WEB-113 Protected Delivery Architecture

## Decision

Ascend Nexus Media uses a hybrid protected-delivery architecture:

- Public previews remain on public, versioned CDN/storage paths.
- Protected media uses private storage by default.
- Member stream/download authorization is server authoritative and delegates to the ANM-WEB-112 access evaluator.
- Local and gateway-compatible deployments deliver protected bytes through `/api/member/media/stream/:authorizationReference` and `/api/member/media/download/:downloadReference`.
- Signed CDN delivery remains readiness-only until production CDN signing, origin isolation, and revocation behavior are verified.

## Authorization Source Of Truth

`ProtectedContentDeliveryAuthorizationService` resolves the private storage object, delivery profile, member session, account status, active membership, required entitlement, and content access decision before issuing any delivery artifact.

## Token Strategy

Authorizations are short lived. Raw tokens are returned only as part of the delivery reference and are hashed at rest. The gateway validates token hash, session binding, member binding, status, expiration, action, and private storage classification.

## Range Strategy

The gateway supports `HEAD`, full `GET`, and single `Range` requests. Valid ranges return `206` with `Content-Range`, `Content-Length`, `Accept-Ranges: bytes`, and `Cache-Control: private, no-store`.

## Revocation Strategy

Authorizations and playback sessions can be revoked for a member or resource. Takedown marks protected resources blocked, revokes active authorizations, and revokes playback sessions.

## Cache/Search/SEO Isolation

Protected gateway responses are private/no-store. Public delivery safety scans verify public APIs, metadata, and search-facing projections do not contain private paths, signed URLs, storage paths, or full-song references.

## Known Limitations

Live CDN signing, adaptive HLS/DASH segment protection, production origin-bypass testing, and staged protected media E2E require deployed infrastructure and fixtures.
