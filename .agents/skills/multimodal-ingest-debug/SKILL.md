---
name: multimodal-ingest-debug
description: Diagnose and fix multimodal run ingestion issues in this repository. Use when text, image, or audio inputs are missing or malformed, when ffmpeg or whisper transcription fails, when temp-file handling breaks, or when modality warnings appear in run events.
---

# Multimodal Ingest Debug

Use this skill to trace failures from request parsing through tool execution.

## Execute Workflow

1. Read `references/ingest-debug-touchpoints.md`.
2. Identify failing modality path: request parse, temp file write, transcription tool, or graph node handling.
3. Reproduce with the smallest input that still triggers the issue.
4. Patch parsing/tool/config code and keep failure paths explicit with warnings.
5. Re-run targeted API tests and verify run result and trace behavior.

## Preserve Invariants

- Accept at least one modality (`text`, `image`, `audio`) and reject fully empty runs.
- Preserve multipart field names and behavior in upload parsing.
- Keep audio temp files cleaned up after run completion or failure.
- Keep transcription pre-processing (`ffmpeg` mono/16k) aligned with whisper input expectations.
- Return no-op findings plus warnings for missing modalities instead of crashing specialist nodes.

## Validate Changes

Run from repository root:

```bash
pnpm --filter @media-triage/api test
pnpm --filter @media-triage/api typecheck
```

Use a manual smoke request when debugging multipart flows:

```bash
curl -X POST http://localhost:8080/v1/runs \
  -F 'text=Customer says audio is garbled after update' \
  -F 'audio=@/absolute/path/to/sample.wav'
```

## Done Criteria

- Ingestion path handles expected modality combinations.
- Warnings are informative for partial failures.
- No leaked temp audio files.
- API tests and typecheck pass.
