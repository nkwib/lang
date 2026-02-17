import path from "node:path";

export interface AppConfig {
  host: string;
  port: number;
  ollamaBaseUrl: string;
  ollamaTextModel: string;
  ollamaVisionModel: string;
  ollamaEmbedModel: string;
  whisperBin: string;
  whisperModelPath: string;
  tempDir: string;
  kbDir: string;
  runTimeoutMs: number;
  modelTimeoutMs: number;
  visionTimeoutMs: number;
  toolTimeoutMs: number;
  kbInitTimeoutMs: number;
  kbSearchTimeoutMs: number;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(): AppConfig {
  return {
    host: process.env.HOST ?? "0.0.0.0",
    port: parseNumber(process.env.PORT, 8080),
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    ollamaTextModel: process.env.OLLAMA_TEXT_MODEL ?? "llama3.2",
    ollamaVisionModel: process.env.OLLAMA_VISION_MODEL ?? "llava",
    ollamaEmbedModel: process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text",
    whisperBin: process.env.WHISPER_BIN ?? "/usr/local/bin/whisper-cli",
    whisperModelPath: process.env.WHISPER_MODEL_PATH ?? "/models/ggml-base.en.bin",
    tempDir: path.resolve(process.cwd(), process.env.TEMP_DIR ?? ".tmp"),
    kbDir: path.resolve(process.cwd(), process.env.KB_DIR ?? "data/support_kb"),
    runTimeoutMs: parseNumber(process.env.RUN_TIMEOUT_MS, 120000),
    modelTimeoutMs: parseNumber(process.env.MODEL_TIMEOUT_MS, 45000),
    visionTimeoutMs: parseNumber(process.env.VISION_TIMEOUT_MS, 90000),
    toolTimeoutMs: parseNumber(process.env.TOOL_TIMEOUT_MS, 60000),
    kbInitTimeoutMs: parseNumber(process.env.KB_INIT_TIMEOUT_MS, 20000),
    kbSearchTimeoutMs: parseNumber(process.env.KB_SEARCH_TIMEOUT_MS, 10000),
  };
}
