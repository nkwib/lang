# Ingest Debug Touchpoints

Use this map to trace request-to-graph modality issues.

## Primary Files

| Area | File | Why it matters |
| --- | --- | --- |
| Multipart and JSON parsing | `apps/api/src/lib/uploads.ts` | Converts request payload into `RunInput` modality fields. |
| Audio transcription tool | `apps/api/src/tools/transcribe-audio.ts` | Runs ffmpeg normalization and whisper transcription. |
| Runtime settings | `apps/api/src/lib/config.ts` | Controls binary/model paths and timeout values. |
| Graph modality handling | `apps/api/src/graph/create-triage-graph.ts` | Converts missing modalities to warnings and no-op findings. |
| Run cleanup lifecycle | `apps/api/src/graph/runner.ts` | Deletes temp audio file after run completion/failure. |
| Endpoint acceptance and errors | `apps/api/src/routes/runs.ts` | Rejects fully empty runs and starts async execution. |
| Existing tests | `apps/api/tests/runs.spec.ts` | Basic route acceptance/rejection coverage. |
| Ops guide | `TROUBLESHOOTING.md` | Operational checks for Ollama, ffmpeg, whisper, and KB. |

## Debug Sequence

1. Confirm request parse output by reproducing minimal payload.
2. Verify file write and extension handling for audio input.
3. Verify `WHISPER_BIN`, `WHISPER_MODEL_PATH`, and timeout settings.
4. Reproduce specialist node output in trace and warnings stream.
5. Confirm temp file cleanup happens in runner `finally` block.
