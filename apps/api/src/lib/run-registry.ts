import { randomUUID } from "node:crypto";
import type {
  FinalTriageDecision,
  NodeTrace,
  RunEvent,
  RunEventType,
  RunTraceResponse,
} from "@media-triage/contracts";
import type { RunRecord } from "../types/runtime";
import { isoToMs } from "./async";

function nowIso(): string {
  return new Date().toISOString();
}

export class RunRegistry {
  private readonly runs = new Map<string, RunRecord>();

  createRun(runId?: string): RunRecord {
    const id = runId ?? `run_${randomUUID()}`;
    const record: RunRecord = {
      runId: id,
      status: "queued",
      createdAt: nowIso(),
      events: [],
      warnings: [],
      listeners: new Set(),
    };

    this.runs.set(id, record);
    return record;
  }

  getRun(runId: string): RunRecord | undefined {
    return this.runs.get(runId);
  }

  listRuns(): RunRecord[] {
    return [...this.runs.values()];
  }

  subscribe(runId: string, listener: (event: RunEvent) => void): () => void {
    const run = this.runs.get(runId);
    if (!run) {
      return () => {};
    }

    run.listeners.add(listener);
    return () => run.listeners.delete(listener);
  }

  addEvent(
    runId: string,
    eventType: RunEventType,
    node?: string,
    message?: string,
    payload?: unknown,
  ): RunEvent {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`run ${runId} not found`);
    }

    const event: RunEvent = {
      runId,
      eventType,
      timestamp: nowIso(),
      ...(node ? { node } : {}),
      ...(message ? { message } : {}),
      ...(payload !== undefined ? { payload } : {}),
    };

    run.events.push(event);
    for (const listener of run.listeners) {
      listener(event);
    }

    return event;
  }

  markRunning(runId: string): void {
    const run = this.runs.get(runId);
    if (!run) {
      return;
    }

    run.status = "running";
    run.startedAt = nowIso();
  }

  addWarning(runId: string, warning: string, node?: string): void {
    const run = this.runs.get(runId);
    if (!run) {
      return;
    }

    run.warnings.push(warning);
    this.addEvent(runId, "warning", node, warning);
  }

  complete(
    runId: string,
    data: {
      finalDecision?: FinalTriageDecision;
      actionPlan?: string;
      warnings?: string[];
    },
  ): void {
    const run = this.runs.get(runId);
    if (!run) {
      return;
    }

    run.status = "completed";
    run.endedAt = nowIso();
    run.finalDecision = data.finalDecision;
    run.actionPlan = data.actionPlan;

    if (data.warnings) {
      for (const warning of data.warnings) {
        if (!run.warnings.includes(warning)) {
          run.warnings.push(warning);
        }
      }
    }

    this.addEvent(runId, "run_completed", undefined, "Run completed", {
      finalDecision: data.finalDecision,
      actionPlan: data.actionPlan,
      warnings: run.warnings,
    });
  }

  fail(runId: string, error: string): void {
    const run = this.runs.get(runId);
    if (!run) {
      return;
    }

    run.status = "failed";
    run.endedAt = nowIso();
    run.error = error;
    this.addEvent(runId, "run_failed", undefined, error);
  }

  getTrace(runId: string): RunTraceResponse | undefined {
    const run = this.runs.get(runId);
    if (!run) {
      return undefined;
    }

    const nodes = new Map<string, NodeTrace>();

    for (const event of run.events) {
      if (!event.node) {
        continue;
      }

      const existing = nodes.get(event.node) ?? {
        node: event.node,
        status: "unknown",
        warnings: [],
      };

      if (event.eventType === "node_started") {
        existing.startedAt = event.timestamp;
        existing.status = "running";
      }

      if (event.eventType === "node_finished") {
        existing.endedAt = event.timestamp;
        existing.status = "completed";
      }

      if (event.eventType === "warning" && event.message) {
        if (!existing.warnings.includes(event.message)) {
          existing.warnings.push(event.message);
        }
      }

      const startedMs = isoToMs(existing.startedAt);
      const endedMs = isoToMs(existing.endedAt);
      if (startedMs !== undefined && endedMs !== undefined && endedMs >= startedMs) {
        existing.durationMs = endedMs - startedMs;
      }

      nodes.set(event.node, existing);
    }

    const startedMs = isoToMs(run.startedAt);
    const endedMs = isoToMs(run.endedAt);
    const totalDurationMs =
      startedMs !== undefined && endedMs !== undefined && endedMs >= startedMs
        ? endedMs - startedMs
        : undefined;

    const orderedNodes = [...nodes.values()].sort((a, b) => {
      const left = isoToMs(a.startedAt) ?? Number.MAX_SAFE_INTEGER;
      const right = isoToMs(b.startedAt) ?? Number.MAX_SAFE_INTEGER;
      if (left !== right) {
        return left - right;
      }
      return a.node.localeCompare(b.node);
    });

    return {
      runId: run.runId,
      status: run.status,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      totalDurationMs,
      eventsCount: run.events.length,
      warnings: run.warnings,
      nodes: orderedNodes,
    };
  }
}
