# Finance import recovery report JSON export

This utility validates the structured recovery report before producing stable JSON text. It uses fixed key ordering, two-space indentation, and a trailing newline. Parsing validates the JSON structure before returning a typed report.

Validation enforces status-to-case identity (including null batch identity for missing metadata), non-empty discrepancy/investigation/evidence fields, unique affected row numbers, unique evidence keys, and immutable false safety flags. This prevents structurally valid JSON from representing contradictory recovery state.

This is a pure serialization helper with no filesystem, HTTP, or database operations. Delivery channel and access policy remain the caller's responsibility. The report is informational and does not authorise financial actions.
