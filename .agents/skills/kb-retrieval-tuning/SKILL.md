---
name: kb-retrieval-tuning
description: Tune and debug support knowledge retrieval quality in this repository. Use when KB hints are empty, irrelevant, or unstable, when embedding initialization/search fails, or when retrieval output format needs adjustment for downstream triage synthesis.
---

# KB Retrieval Tuning

Use this skill to improve hint quality while preserving runtime safety.

## Execute Workflow

1. Read `references/kb-touchpoints.md`.
2. Reproduce the failing query and capture returned hints.
3. Adjust retrieval inputs, ranking behavior, or KB content in small steps.
4. Keep tool schema and query defaults aligned with graph expectations.
5. Validate with API tests and at least one manual run that uses KB hints.

## Preserve Invariants

- Keep markdown documents as KB source of truth.
- Keep embedding model configuration aligned with runtime environment.
- Keep `topK` validation constraints consistent between tool schema and retrieval behavior.
- Keep returned hint format stable unless graph synthesis prompt is updated together.
- Keep empty KB states non-fatal and surfaced through warnings/no-op findings.

## Validate Changes

Run from repository root:

```bash
pnpm --filter @media-triage/api test
pnpm --filter @media-triage/api typecheck
```

When shared schema or event shapes change, also run:

```bash
pnpm --filter @media-triage/contracts test
```

## Done Criteria

- Retrieval returns relevant hints for representative support queries.
- Empty or failed KB paths degrade gracefully.
- Tests and typecheck pass for touched packages.
