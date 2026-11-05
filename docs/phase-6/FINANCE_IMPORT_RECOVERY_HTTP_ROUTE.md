# Finance import recovery report HTTP route factory

## Purpose

Provides an opt-in Express router for downloading a recovery report by batch ID. The router is not mounted in the application by default.

## Required integration dependencies

- An explicit authorization middleware implementing the Finance/DET-approved access matrix.
- A resolver that returns a previously generated download descriptor for the requested batch, or `null` when no report exists.

## HTTP behaviour

- `GET /:batchId/recovery-report.json`
- Invalid batch identifiers return HTTP 400.
- Missing reports return HTTP 404.
- Successful responses use the descriptor's JSON content type, attachment disposition, and no-store cache policy.
- Resolver errors are passed to the central Express error handler.

## Security boundary

The route factory does not invent permission codes, authenticate independently, decide report visibility, or mount itself. The application must supply the approved authorization middleware and explicitly mount the router only after Finance/DET approval. Until then, this remains an unmounted integration component.

## Integration-test coverage

The route test suite exercises the router through a real ephemeral Express HTTP server using Node's built-in `fetch`; no additional HTTP test dependency is required.

Covered behaviours:
- An injected 403 authorization response prevents the resolver from running.
- An authorized request returns the report body and the descriptor's content type, attachment disposition, and cache-control headers.
- A missing report returns 404.
- An invalid batch identifier returns 400 without invoking the resolver.
- Resolver failures reach the Express error handler.

These tests validate the factory contract only. They do not authorize mounting the router, define production permissions, or establish report storage/retention policy.
