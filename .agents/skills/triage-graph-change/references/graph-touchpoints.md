# Graph Touchpoints

Use this map to avoid partial edits when changing triage graph behavior.

## Primary Files

| Area | File | Why it matters |
| --- | --- | --- |
| Graph topology and node logic | `apps/api/src/graph/create-triage-graph.ts` | Defines node implementations, edges, and conditional routing. |
| Graph state shape and reducers | `apps/api/src/graph/state.ts` | Defines state fields and merge behavior for parallel branches. |
| Prompt templates | `apps/api/src/graph/prompts.ts` | Controls specialist and synthesizer instructions. |
| Specialist node output schema | `apps/api/src/graph/schemas.ts` | Validates structured outputs before state merge. |
| Shared contracts and enums | `packages/contracts/src/index.ts` | Defines run events, specialist sources, decision schema, and API response shape. |
| API route response wiring | `apps/api/src/routes/runs.ts` | Exposes run lifecycle, SSE events, result snapshot, and trace endpoint. |
| Run lifecycle orchestration | `apps/api/src/graph/runner.ts` | Initializes graph state and persists completion/failure. |
| Runtime configuration | `apps/api/src/lib/config.ts` | Holds timeouts and model/tool runtime settings that affect graph behavior. |

## Change Matrix

| You are changing... | Update these files at minimum | Validate with |
| --- | --- | --- |
| Add/remove specialist node | `create-triage-graph.ts`, `state.ts`, `contracts/src/index.ts`, optionally `prompts.ts`, `schemas.ts` | `pnpm --filter @media-triage/contracts test` and `pnpm --filter @media-triage/api test` |
| Add/change state fields | `state.ts`, `create-triage-graph.ts`, `runner.ts` | `pnpm --filter @media-triage/api typecheck` and tests |
| Change output schema/decision shape | `schemas.ts`, `contracts/src/index.ts`, `create-triage-graph.ts`, route consumers | contracts + api tests |
| Change routing or escalation logic | `create-triage-graph.ts`, `contracts/src/index.ts` (if enums change), tests | api tests + trace behavior checks |
| Change prompt behavior only | `prompts.ts`, possibly `schemas.ts` if structure changes | api tests |
| Change run event usage | `contracts/src/index.ts`, `run-registry.ts`, `routes/runs.ts`, graph wrapper emitters | contracts + api tests |

## Runtime Checks

1. Submit a text-only run and confirm non-error completion.
2. Confirm trace shows expected node sequence and action node selection.
3. Confirm warnings behavior for missing modalities still matches intended design.
