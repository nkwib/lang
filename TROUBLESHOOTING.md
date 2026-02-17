# Troubleshooting

## Ollama connection errors

Symptoms:

- API warnings mention `ECONNREFUSED` or model invocation failures.

Checks:

1. Verify daemon is running: `ollama ps`
2. Verify base URL in env:
   - local default: `http://localhost:11434`
   - docker API default: `http://host.docker.internal:11434`
3. Verify models exist: `ollama list`

## Missing model errors

Symptoms:

- Warnings mention unknown model name.

Fix:

1. Pull required models:
   - `ollama pull llama3.2`
   - `ollama pull llava`
   - `ollama pull nomic-embed-text`
2. Ensure env model names match.

## Audio transcription failures

Symptoms:

- Warnings mention `ffmpeg` or `whisper-cli` command not found.

Local fix:

1. Install `ffmpeg`.
2. Install `whisper.cpp` and ensure `whisper-cli` is executable.
3. Set env:
   - `WHISPER_BIN=/path/to/whisper-cli`
   - `WHISPER_MODEL_PATH=/path/to/ggml-base.en.bin`

Docker fix:

- Rebuild image: `pnpm docker:up --build`

## KB retrieval empty

Symptoms:

- Warning: knowledge retrieval returned no hints.

Checks:

1. Ensure markdown files exist in `/Users/gab/work/lang/apps/api/data/support_kb`.
2. Ensure embedding model is pulled (`nomic-embed-text`).
3. Check `/healthz` for KB status.
