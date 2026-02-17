# Trace Touchpoints

Use this map to debug run lifecycle and node-trace issues.

## Primary Files

| Area | File | Why it matters |
| --- | --- | --- |
| Run lifecycle and trace builder | `apps/api/src/lib/run-registry.ts` | Stores runs, emits events, computes node traces and run summary fields. |
| Graph event emission | `apps/api/src/graph/create-triage-graph.ts` | Emits node start/finish/warning events via wrapped node execution. |
| Run orchestration | `apps/api/src/graph/runner.ts` | Marks run running/completed/failed and applies timeout/error boundaries. |
| API endpoints | `apps/api/src/routes/runs.ts` | Streams SSE events and serves result and trace snapshots. |
| Event and trace contracts | `packages/contracts/src/index.ts` | Defines allowed event types and trace response shape. |
| Existing API tests | `apps/api/tests/runs.spec.ts` | Baseline run-route behavior expectations. |

## Investigation Sequence

1. Confirm event order for the run and detect missing/duplicate lifecycle events.
2. Confirm node-level start/finish pairings and warning attribution.
3. Confirm trace duration calculation and node ordering behavior.
4. Confirm route responses include consistent status, timestamps, and warning lists.
5. Confirm contract enums/schemas still match emitted runtime values.
