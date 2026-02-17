# KB Touchpoints

Use this map for retrieval-quality and retrieval-reliability edits.

## Primary Files

| Area | File | Why it matters |
| --- | --- | --- |
| Retrieval tool wrapper | `apps/api/src/tools/retrieve-kb-hints.ts` | Validates query/topK and returns hints to graph nodes. |
| KB implementation | `apps/api/src/kb/knowledge-base.ts` | Builds embeddings, ranks with cosine similarity, and formats snippets. |
| Runtime configuration | `apps/api/src/lib/config.ts` | Sets `KB_DIR`, embedding model, and initialization/search timeouts. |
| Graph usage of hints | `apps/api/src/graph/create-triage-graph.ts` | Invokes retrieval and merges hints into synthesis context. |
| KB content | `apps/api/data/support_kb/*.md` | Source documents indexed for retrieval. |
| Prompt consumer | `apps/api/src/graph/prompts.ts` | Uses KB hints in specialist and synthesizer prompts. |
| Troubleshooting | `TROUBLESHOOTING.md` | Existing operational fixes for empty-hint scenarios. |

## Tuning Levers

1. Improve KB source markdown content for coverage and clarity.
2. Improve query construction in graph route logic.
3. Tune `topK` usage and snippet formatting for synthesis quality.
4. Tune timeout and model configuration for reliability.
5. Keep behavior deterministic for empty or failed retrieval responses.
