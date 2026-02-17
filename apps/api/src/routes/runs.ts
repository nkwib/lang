import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { RunAcceptedResponse, RunResultResponse } from "@media-triage/contracts";
import { randomUUID } from "node:crypto";
import { parseRunInputFromRequest } from "../lib/uploads";
import { RunRegistry } from "../lib/run-registry";
import { TriageGraphRunner } from "../graph/runner";

interface RunRoutesOptions {
  runRegistry: RunRegistry;
  graphRunner: TriageGraphRunner;
  tempDir: string;
}

function buildResultResponse(runRegistry: RunRegistry, runId: string): RunResultResponse | undefined {
  const run = runRegistry.getRun(runId);
  if (!run) {
    return undefined;
  }

  return {
    runId: run.runId,
    status: run.status,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    finalDecision: run.finalDecision,
    actionPlan: run.actionPlan,
    events: run.events,
    warnings: run.warnings,
    error: run.error,
  };
}

export const runRoutes: FastifyPluginAsync<RunRoutesOptions> = async (
  app: FastifyInstance,
  options,
) => {
  app.post("/v1/runs", async (request, reply) => {
    const runInput = await parseRunInputFromRequest(request, options.tempDir);

    if (!runInput.text && !runInput.imageBase64 && !runInput.audioPath) {
      return reply.code(400).send({
        error: "At least one modality is required: text, image, or audio.",
      });
    }

    const runId = `run_${randomUUID()}`;
    const run = options.runRegistry.createRun(runId);

    const accepted: RunAcceptedResponse = {
      runId,
      status: "queued",
      createdAt: run.createdAt,
    };

    void options.graphRunner.run(runId, runInput);

    return reply.code(202).send(accepted);
  });

  app.get("/v1/runs/:runId/events", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const run = options.runRegistry.getRun(runId);

    if (!run) {
      return reply.code(404).send({ error: `Run ${runId} not found` });
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    for (const event of run.events) {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    const unsubscribe = options.runRegistry.subscribe(runId, (event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(": keepalive\n\n");
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      reply.raw.end();
    });

    return reply;
  });

  app.get("/v1/runs/:runId/result", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const result = buildResultResponse(options.runRegistry, runId);

    if (!result) {
      return reply.code(404).send({ error: `Run ${runId} not found` });
    }

    return reply.send(result);
  });

  app.get("/v1/runs/:runId/trace", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const trace = options.runRegistry.getTrace(runId);

    if (!trace) {
      return reply.code(404).send({ error: `Run ${runId} not found` });
    }

    return reply.send(trace);
  });
};
