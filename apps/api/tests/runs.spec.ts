import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { RunRegistry } from "../src/lib/run-registry";
import { runRoutes } from "../src/routes/runs";

describe("run routes", () => {
  const app = Fastify();
  const runRegistry = new RunRegistry();
  const tempDir = path.join(os.tmpdir(), `triage-tests-${randomUUID()}`);

  const graphRunner = {
    run: vi.fn(async (runId: string) => {
      runRegistry.markRunning(runId);
      runRegistry.addEvent(runId, "run_started", undefined, "started");
      runRegistry.complete(runId, {
        warnings: [],
      });
    }),
  } as never;

  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true });
    await app.register(multipart);
    await app.register(runRoutes, {
      runRegistry,
      graphRunner,
      tempDir,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects empty run payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/runs",
      payload: {},
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("accepts text-only run payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/runs",
      payload: {
        text: "Customer says the new update logs them out repeatedly",
      },
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body.runId).toContain("run_");

    const resultResponse = await app.inject({
      method: "GET",
      url: `/v1/runs/${body.runId}/result`,
    });

    expect(resultResponse.statusCode).toBe(200);

    const traceResponse = await app.inject({
      method: "GET",
      url: `/v1/runs/${body.runId}/trace`,
    });

    expect(traceResponse.statusCode).toBe(200);
    const traceBody = traceResponse.json();
    expect(traceBody.runId).toBe(body.runId);
  });
});
