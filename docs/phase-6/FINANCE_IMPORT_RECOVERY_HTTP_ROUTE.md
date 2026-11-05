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
