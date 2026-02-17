---
name: run-trace-investigation
description: Investigate run-level regressions using events, warnings, and node traces in this repository. Use when runs fail unexpectedly, node sequencing is wrong, trace timings look incorrect, SSE behavior regresses, or run status transitions are inconsistent.
---

# Run Trace Investigation

Use this skill to diagnose runtime execution issues without guessing.

## Execute Workflow

1. Read `references/trace-touchpoints.md`.
2. Reproduce with one run and capture events, result, and trace for the same `runId`.
3. Identify mismatch in status transitions, node lifecycle events, warnings, or durations.
4. Patch event emission or registry aggregation logic at the narrowest layer.
5. Re-run API tests and confirm trace fields align with emitted events.

## Preserve Invariants

- Keep run lifecycle order: `queued` -> `running` -> `completed` or `failed`.
- Keep `run_started` and terminal events (`run_completed` or `run_failed`) emitted exactly once per run.
- Keep node trace timing derived from node start/finish events.
- Keep warning events deduplicated in run summary where intended.
- Keep endpoints stable for `/events`, `/result`, and `/trace`.

## Validate Changes

Run from repository root:

```bash
pnpm --filter @media-triage/api test
pnpm --filter @media-triage/api typecheck
```

Use manual endpoint checks for one known run:

```bash
curl http://localhost:8080/v1/runs/<runId>/result
curl http://localhost:8080/v1/runs/<runId>/trace
curl -N http://localhost:8080/v1/runs/<runId>/events
```

## Done Criteria

- Trace node ordering and durations are coherent.
- Run status and terminal event are consistent.
- Warnings and payloads are preserved in result/trace responses.
- API tests and typecheck pass.
