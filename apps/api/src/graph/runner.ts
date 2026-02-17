import type { FinalTriageDecision } from "@media-triage/contracts";
import type { RunnableConfig } from "@langchain/core/runnables";
import { rm } from "node:fs/promises";
import type { RunInput } from "../types/runtime";
import { RunRegistry } from "../lib/run-registry";
import type { TriageGraphState } from "./state";
import { withTimeout } from "../lib/async";

interface CompiledGraph {
  invoke(input: TriageGraphState, config?: RunnableConfig): Promise<TriageGraphState>;
}

export class TriageGraphRunner {
  constructor(
    private readonly graph: CompiledGraph,
    private readonly runRegistry: RunRegistry,
    private readonly runTimeoutMs: number,
  ) {}

  async run(runId: string, input: RunInput): Promise<void> {
    this.runRegistry.markRunning(runId);
    this.runRegistry.addEvent(runId, "run_started", undefined, "Run execution started");

    try {
      const finalState = await withTimeout(
        this.graph.invoke(
          {
            runId,
            textInput: input.text,
            imageBase64: input.imageBase64,
            imageMimeType: input.imageMimeType,
            audioPath: input.audioPath,
            transcript: undefined,
            hasText: false,
            hasImage: false,
            hasAudio: false,
            kbQuery: undefined,
            specialistFindings: [],
            kbHints: [],
            finalDecision: undefined,
            actionPlan: undefined,
            warnings: [],
          },
          {
            configurable: {
              thread_id: runId,
            },
          },
        ),
        this.runTimeoutMs,
        "Run execution",
      );

      this.runRegistry.complete(runId, {
        finalDecision: finalState.finalDecision as FinalTriageDecision | undefined,
        actionPlan: finalState.actionPlan,
        warnings: finalState.warnings,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.runRegistry.fail(runId, message);
    } finally {
      if (input.audioPath) {
        await rm(input.audioPath, { force: true });
      }
    }
  }
}
