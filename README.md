# TypeScript LangGraph/LangChain Multimodal Multi-Agent POC

This repository is a small, clarity-first **Media Triage** demo for customer support.

## What it demonstrates

- LangGraph typed state with parallel specialist nodes.
- Conditional graph branch (`standard_action_node` vs `escalation_action_node`).
- Multimodal ingestion (text + image + audio).
- Tool abstractions for local transcription and retrieval.
- Structured output with zod schemas.
- SSE event stream to visualize graph execution.

## Monorepo layout

- `/Users/gab/work/lang/apps/api`: Fastify + LangGraph runtime.
- `/Users/gab/work/lang/apps/ui`: SvelteKit frontend.
- `/Users/gab/work/lang/packages/contracts`: Shared contracts and schemas.

## Prerequisites

- Node.js 22+
- pnpm 10+
- Ollama installed and running on host
- Pulled Ollama models:
  - `ollama pull llama3.2`
  - `ollama pull llava`
  - `ollama pull nomic-embed-text`

For local non-Docker API runs, install:

- `ffmpeg`
- `whisper.cpp` CLI binary (`whisper-cli`)
- `ggml-base.en.bin` model

## Install

```bash
pnpm install
```

## Local dev (non-Docker)

Terminal 1:

```bash
pnpm dev:api
```

Terminal 2:

```bash
pnpm dev:ui
```

Open [http://localhost:5173](http://localhost:5173).

## Docker-first run

```bash
pnpm docker:up
```

Then open [http://localhost:5173](http://localhost:5173).

## API endpoints

- `POST /v1/runs` (multipart form data: `text`, optional `image`, optional `audio`)
- `GET /v1/runs/:runId/events` (SSE)
- `GET /v1/runs/:runId/result` (JSON snapshot)
- `GET /v1/runs/:runId/trace` (node timing/status trace)

## Testing

```bash
pnpm test
```

## Troubleshooting

See `/Users/gab/work/lang/TROUBLESHOOTING.md`.
