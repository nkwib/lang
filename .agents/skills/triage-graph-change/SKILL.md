---
name: triage-graph-change
description: Safely modify the media-triage LangGraph pipeline in this repository. Use when adding or removing nodes, changing edges or conditional routing, adjusting triage state fields and reducers, updating specialist prompts/schemas/contracts, or fixing regressions after graph workflow edits.
---

# Triage Graph Change

Use this skill to keep graph edits consistent across API runtime, contracts, and tests.

## Execute Workflow

1. Read `references/graph-touchpoints.md`.
2. Classify the request as topology, state/schema, prompt/tool, or routing/action change.
3. Edit all required touchpoints for that change type before running tests.
4. Run targeted tests first, then run broader checks if shared contracts changed.
5. Confirm run behavior through `/v1/runs/:runId/result` and `/v1/runs/:runId/trace` expectations.

## Preserve Invariants

- Keep at least one modality required before graph execution.
- Keep specialist fan-out from `route_node` to text, vision, audio, and kb specialist nodes unless intentionally redesigning behavior.
- Keep `specialistFindings`, `kbHints`, and `warnings` as append-only reducer arrays unless downstream consumers are updated.
- Keep conditional escalation behavior explicit when severity is `high` or `critical`, or update action-node logic and tests together.
- Keep shared event and decision schemas aligned with contracts when node outputs or run events change.

## Validate Changes

Run from repository root:

```bash
pnpm --filter @media-triage/contracts test
pnpm --filter @media-triage/api test
pnpm --filter @media-triage/api typecheck
```

Run UI tests when result shape, trace shape, or user-facing wording changes:

```bash
pnpm --filter @media-triage/ui test
pnpm --filter @media-triage/ui typecheck
```

## Done Criteria

- Graph compiles and route/action flow matches requested behavior.
- Contracts, schemas, prompts, and state are consistent.
- Targeted tests pass for touched packages.
- No uncaught runtime regressions in run events, run result, or trace endpoints.
