# API versioning policy

Recall's web API is served under `/api/v1`. This document defines how the API is versioned and how breaking changes are introduced.

## Current version

- **v1** is the current and stable version. All endpoints live under `/api/v1/*`.
- The Android client and web app target v1.

## Breaking changes

- **Breaking changes require a new major version prefix** (e.g. `/api/v2`). A new version is published alongside the previous one so clients can migrate.
- A change is considered *breaking* if it alters the shape of a request or response in a way an existing conforming client cannot handle, removes an endpoint, changes status-code semantics, or tightens validation in a way that rejects previously accepted input.
- **Backward-compatible additions are allowed within v1**: new optional request fields, new response fields, new endpoints, and new enum values are not breaking. Clients must ignore unknown response fields.

## Deprecation

- A deprecated endpoint stays available for a **minimum of 3 months** after deprecation is announced.
- Deprecated endpoints emit two response headers:
  - `Deprecation: true`
  - `Sunset: <date>` — the date the endpoint will be removed, in `YYYY-MM-DD` format.
- Deprecation announcements are noted in [`CHANGELOG.md`](../CHANGELOG.md) and the [API overview](../README.md#api-overview).

## Client version negotiation

- Clients may send `X-API-Version: v1` on any request. The server currently serves only v1, so the header is advisory; a mismatched or unknown value does not change behavior. When v2 ships, this header will let clients pin a version during migration.
- Absence of `X-API-Version` defaults to v1.

## Stability expectations

- v1 endpoint paths, request bodies, and response bodies are stable for the lifetime of v1 except for backward-compatible additions.
- Database schema migrations do not affect API stability; column renames or internal changes are not exposed through the API.
