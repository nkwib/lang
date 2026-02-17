import { mkdir } from "node:fs/promises";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { createModels } from "./lib/models";
import { loadConfig, type AppConfig } from "./lib/config";
import { SupportKnowledgeBase } from "./kb/knowledge-base";
import { createRetrieveKbHintsTool } from "./tools/retrieve-kb-hints";
import { createTranscribeAudioTool } from "./tools/transcribe-audio";
import { RunRegistry } from "./lib/run-registry";
import { createTriageGraph } from "./graph/create-triage-graph";
import { TriageGraphRunner } from "./graph/runner";
import { runRoutes } from "./routes/runs";

export interface AppContext {
  config: AppConfig;
  runRegistry: RunRegistry;
  graphRunner: TriageGraphRunner;
  knowledgeBase: SupportKnowledgeBase;
}

export async function createApp(customConfig?: AppConfig) {
  const config = customConfig ?? loadConfig();

  await mkdir(config.tempDir, { recursive: true });

  const app = Fastify({
    logger: {
      level: "info",
    },
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 2,
    },
  });

  const runRegistry = new RunRegistry();
  const knowledgeBase = new SupportKnowledgeBase(config);
  await knowledgeBase.initialize();
  const kbStatus = knowledgeBase.getStatus();
  if (!kbStatus.ready && kbStatus.error) {
    app.log.warn({ kbError: kbStatus.error }, "Knowledge base not ready. Retrieval will fallback.");
  }

  const models = createModels(config);
  const transcribeAudioTool = createTranscribeAudioTool(config);
  const retrieveKbHintsTool = createRetrieveKbHintsTool(knowledgeBase);

  const graph = createTriageGraph({
    textModel: models.textModel,
    visionModel: models.visionModel,
    transcribeAudioTool,
    retrieveKbHintsTool,
    modelTimeoutMs: config.modelTimeoutMs,
    visionTimeoutMs: config.visionTimeoutMs,
    toolTimeoutMs: config.toolTimeoutMs,
    emitEvent: ({ runId, eventType, node, message, payload }) => {
      if (eventType === "warning" && message) {
        runRegistry.addWarning(runId, message, node);
        return;
      }
      runRegistry.addEvent(runId, eventType, node, message, payload);
    },
  });

  const graphRunner = new TriageGraphRunner(graph, runRegistry, config.runTimeoutMs);

  app.decorate("triageContext", {
    config,
    runRegistry,
    graphRunner,
    knowledgeBase,
  } satisfies AppContext);

  await app.register(runRoutes, {
    runRegistry,
    graphRunner,
    tempDir: config.tempDir,
  });

  app.get("/healthz", async () => {
    return {
      ok: true,
      kb: knowledgeBase.getStatus(),
    };
  });

  return app;
}
