FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg git build-essential cmake ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git /tmp/whisper.cpp \
  && cmake -S /tmp/whisper.cpp -B /tmp/whisper.cpp/build \
  && cmake --build /tmp/whisper.cpp/build --config Release -j \
  && cp /tmp/whisper.cpp/build/bin/whisper-cli /usr/local/bin/whisper-cli \
  && mkdir -p /models \
  && /tmp/whisper.cpp/models/download-ggml-model.sh base.en \
  && cp /tmp/whisper.cpp/models/ggml-base.en.bin /models/ggml-base.en.bin \
  && rm -rf /tmp/whisper.cpp

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN corepack enable && pnpm install --no-frozen-lockfile

COPY apps/api apps/api
COPY packages/contracts packages/contracts

RUN pnpm --filter @media-triage/contracts build \
  && pnpm --filter @media-triage/api build

EXPOSE 8080

ENV HOST=0.0.0.0
ENV PORT=8080
ENV OLLAMA_BASE_URL=http://host.docker.internal:11434
ENV WHISPER_BIN=/usr/local/bin/whisper-cli
ENV WHISPER_MODEL_PATH=/models/ggml-base.en.bin

CMD ["pnpm", "--filter", "@media-triage/api", "start"]
