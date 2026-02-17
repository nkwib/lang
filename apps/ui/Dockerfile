FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/ui/package.json apps/ui/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN corepack enable && pnpm install --no-frozen-lockfile

COPY apps/ui apps/ui
COPY packages/contracts packages/contracts

RUN pnpm --filter @media-triage/contracts build \
  && pnpm --filter @media-triage/ui build

EXPOSE 5173

ENV PORT=5173
ENV HOST=0.0.0.0
ENV PUBLIC_API_BASE_URL=http://localhost:8080

CMD ["pnpm", "--filter", "@media-triage/ui", "preview", "--host", "0.0.0.0", "--port", "5173"]
