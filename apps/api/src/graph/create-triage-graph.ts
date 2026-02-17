import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { finalTriageDecisionSchema, specialistFindingSchema } from "@media-triage/contracts";
import type { ChatOllama } from "@langchain/ollama";
import type { RunEventType, SpecialistSource } from "@media-triage/contracts";
import {
  audioSpecialistPrompt,
  kbSpecialistPrompt,
  synthesizePrompt,
  textSpecialistPrompt,
} from "./prompts";
import { specialistOutputSchema } from "./schemas";
import { TriageStateAnnotation, type TriageGraphState } from "./state";
import { withTimeout } from "../lib/async";

const escalationSeverities = new Set(["high", "critical"]);

interface ToolInvoker<I, O> {
  invoke(input: I): Promise<O>;
}

export interface TriageGraphDeps {
  textModel: ChatOllama;
  visionModel: ChatOllama;
  transcribeAudioTool: ToolInvoker<{ audioPath: string }, string>;
  retrieveKbHintsTool: ToolInvoker<{ query: string; topK?: number }, string[]>;
  modelTimeoutMs: number;
  visionTimeoutMs: number;
  toolTimeoutMs: number;
  emitEvent: (params: {
    runId: string;
    eventType: RunEventType;
    node?: string;
    message?: string;
    payload?: unknown;
  }) => void;
}

type NodeFn = (state: TriageGraphState, deps: TriageGraphDeps) => Promise<Partial<TriageGraphState>>;

function buildNoopFinding(source: SpecialistSource, reason: string) {
  return specialistFindingSchema.parse({
    source,
    keyPoints: [reason],
    riskFlags: [],
    confidence: 0,
  });
}

function wrapNode(name: string, nodeFn: NodeFn, deps: TriageGraphDeps) {
  return async (state: TriageGraphState): Promise<Partial<TriageGraphState>> => {
    deps.emitEvent({
      runId: state.runId,
      eventType: "node_started",
      node: name,
      message: `${name} started`,
    });

    const result = await nodeFn(state, deps);

    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    for (const warning of warnings) {
      deps.emitEvent({
        runId: state.runId,
        eventType: "warning",
        node: name,
        message: warning,
      });
    }

    deps.emitEvent({
      runId: state.runId,
      eventType: "node_finished",
      node: name,
      message: `${name} finished`,
    });

    return result;
  };
}

const ingestNode: NodeFn = async (state) => {
  const text = state.textInput?.trim();

  if (!text && !state.imageBase64 && !state.audioPath) {
    throw new Error("At least one modality is required (text, image, or audio).");
  }

  return {
    textInput: text,
    hasText: Boolean(text),
    hasImage: Boolean(state.imageBase64),
    hasAudio: Boolean(state.audioPath),
  };
};

const routeNode: NodeFn = async (state) => {
  const kbQuery = state.textInput?.trim() || state.transcript?.trim() || "general support issue";

  return {
    kbQuery,
  };
};

const textSpecialistNode: NodeFn = async (state, deps) => {
  if (!state.hasText || !state.textInput) {
    return {
      specialistFindings: [
        buildNoopFinding("text", "No text input was provided for text specialist analysis."),
      ],
      warnings: ["Text modality missing; text specialist emitted no-op finding."],
    };
  }

  try {
    const chain: any = textSpecialistPrompt.pipe(
      (deps.textModel as any).withStructuredOutput(specialistOutputSchema as any),
    );

    const outputRaw = await withTimeout(
      chain.invoke({
        text: state.textInput,
      }),
      deps.modelTimeoutMs,
      "Text specialist model call",
    );
    const output = specialistOutputSchema.parse(outputRaw);

    return {
      specialistFindings: [
        specialistFindingSchema.parse({
          source: "text",
          ...output,
        }),
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      specialistFindings: [buildNoopFinding("text", "Text analysis failed and returned no-op finding.")],
      warnings: [`Text specialist failed: ${message}`],
    };
  }
};

const visionSpecialistNode: NodeFn = async (state, deps) => {
  if (!state.hasImage || !state.imageBase64) {
    return {
      specialistFindings: [
        buildNoopFinding("vision", "No image input was provided for vision specialist analysis."),
      ],
      warnings: ["Image modality missing; vision specialist emitted no-op finding."],
    };
  }

  try {
    const structuredVisionModel = (deps.visionModel as any).withStructuredOutput(
      specialistOutputSchema as any,
    );
    const outputRaw = await withTimeout(
      structuredVisionModel.invoke([
        {
          role: "system",
          content:
            "You analyze customer-submitted images for support triage. Extract issue signals, visible artifacts, and risk indicators.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Customer context: ${state.textInput ?? "No text context provided."}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${state.imageMimeType ?? "image/jpeg"};base64,${state.imageBase64}`,
              },
            },
          ],
        } as never,
      ] as never),
      deps.visionTimeoutMs,
      "Vision specialist model call",
    );
    const output = specialistOutputSchema.parse(outputRaw);

    return {
      specialistFindings: [
        specialistFindingSchema.parse({
          source: "vision",
          ...output,
        }),
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      specialistFindings: [
        buildNoopFinding("vision", "Vision analysis failed and returned no-op finding."),
      ],
      warnings: [`Vision specialist failed: ${message}`],
    };
  }
};

const audioSpecialistNode: NodeFn = async (state, deps) => {
  if (!state.hasAudio || !state.audioPath) {
    return {
      specialistFindings: [
        buildNoopFinding("audio", "No audio input was provided for audio specialist analysis."),
      ],
      warnings: ["Audio modality missing; audio specialist emitted no-op finding."],
    };
  }

  try {
    const transcript = await withTimeout(
      deps.transcribeAudioTool.invoke({ audioPath: state.audioPath }),
      deps.toolTimeoutMs,
      "Audio transcription tool call",
    );

    if (!transcript.trim()) {
      return {
        transcript,
        specialistFindings: [
          buildNoopFinding("audio", "Audio transcription returned empty content."),
        ],
        warnings: ["Audio transcription returned empty content."],
      };
    }

    const chain = audioSpecialistPrompt.pipe(
      (deps.textModel as any).withStructuredOutput(specialistOutputSchema as any),
    );

    const outputRaw = await withTimeout(
      (chain as any).invoke({ transcript }),
      deps.modelTimeoutMs,
      "Audio specialist model call",
    );
    const output = specialistOutputSchema.parse(outputRaw);

    return {
      transcript,
      specialistFindings: [
        specialistFindingSchema.parse({
          source: "audio",
          ...output,
        }),
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      specialistFindings: [buildNoopFinding("audio", "Audio analysis failed and returned no-op finding.")],
      warnings: [`Audio specialist failed: ${message}`],
    };
  }
};

const kbSpecialistNode: NodeFn = async (state, deps) => {
  if (!state.kbQuery) {
    return {
      specialistFindings: [buildNoopFinding("kb", "KB query was empty and returned no-op finding.")],
      warnings: ["KB query missing; KB specialist emitted no-op finding."],
    };
  }

  try {
    const hints = await withTimeout(
      deps.retrieveKbHintsTool.invoke({
        query: state.kbQuery,
        topK: 3,
      }),
      deps.toolTimeoutMs,
      "KB retrieval tool call",
    );

    if (!hints.length) {
      return {
        specialistFindings: [
          buildNoopFinding("kb", "No relevant KB hints found for the current issue context."),
        ],
        warnings: ["Knowledge retrieval returned no hints."],
      };
    }

    const chain = kbSpecialistPrompt.pipe(
      (deps.textModel as any).withStructuredOutput(specialistOutputSchema as any),
    );

    const outputRaw = await withTimeout(
      (chain as any).invoke({
        hints: hints.join("\n"),
        textContext: state.textInput ?? state.transcript ?? "No user context.",
      }),
      deps.modelTimeoutMs,
      "KB specialist model call",
    );
    const output = specialistOutputSchema.parse(outputRaw);

    return {
      kbHints: hints,
      specialistFindings: [
        specialistFindingSchema.parse({
          source: "kb",
          ...output,
        }),
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      specialistFindings: [buildNoopFinding("kb", "KB specialist failed and returned no-op finding.")],
      warnings: [`KB specialist failed: ${message}`],
    };
  }
};

const synthesizeNode: NodeFn = async (state, deps) => {
  if (!state.specialistFindings.length) {
    return {
      finalDecision: finalTriageDecisionSchema.parse({
        category: "general_inquiry",
        severity: "low",
        sentiment: "neutral",
        summary: "No specialist findings were available, defaulting to low-severity general inquiry.",
        evidence: [],
        nextAction: "request_info",
        confidence: 0.2,
      }),
      warnings: ["Synthesis ran without specialist findings; generated fallback decision."],
    };
  }

  try {
    const chain: any = synthesizePrompt.pipe(
      (deps.textModel as any).withStructuredOutput(finalTriageDecisionSchema as any),
    );

    const decision = await withTimeout(
      chain.invoke({
        findingsJson: JSON.stringify(state.specialistFindings, null, 2),
        kbHints: state.kbHints.join("\n") || "No KB hints available.",
        textContext: state.textInput ?? "No text context.",
        transcriptContext: state.transcript ?? "No transcript context.",
      }),
      deps.modelTimeoutMs,
      "Synthesizer model call",
    );

    return {
      finalDecision: finalTriageDecisionSchema.parse(decision),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const highestConfidence =
      state.specialistFindings.sort((a, b) => b.confidence - a.confidence)[0] ??
      buildNoopFinding("text", "No findings available.");

    return {
      finalDecision: finalTriageDecisionSchema.parse({
        category: "manual_review",
        severity: "medium",
        sentiment: "mixed",
        summary: "Model synthesis failed; generated deterministic fallback triage decision.",
        evidence: highestConfidence.keyPoints,
        nextAction: "request_info",
        confidence: 0.3,
      }),
      warnings: [`Synthesizer failed: ${message}`],
    };
  }
};

const standardActionNode: NodeFn = async (state) => {
  const decision = state.finalDecision;
  if (!decision) {
    return {
      actionPlan:
        "No final decision available. Send acknowledgement and request more customer details.",
    };
  }

  const plan = [
    `1) Acknowledge issue category: ${decision.category}.`,
    `2) Provide immediate support response with severity level ${decision.severity}.`,
    `3) Execute next action: ${decision.nextAction}.`,
    "4) Confirm resolution details and ask if further help is needed.",
  ].join("\n");

  return {
    actionPlan: plan,
  };
};

const escalationActionNode: NodeFn = async (state) => {
  const decision = state.finalDecision;
  const plan = [
    "1) Escalate to Tier-2 support queue immediately.",
    `2) Severity: ${decision?.severity ?? "high"}. Category: ${decision?.category ?? "unknown"}.`,
    `3) Include evidence: ${(decision?.evidence ?? []).join("; ") || "No evidence provided."}`,
    "4) Notify customer about escalation ETA and assign owner.",
  ].join("\n");

  return {
    actionPlan: plan,
  };
};

export function createTriageGraph(deps: TriageGraphDeps) {
  const graph = new StateGraph(TriageStateAnnotation)
    .addNode("ingest_node", wrapNode("ingest_node", ingestNode, deps))
    .addNode("route_node", wrapNode("route_node", routeNode, deps))
    .addNode("text_specialist_node", wrapNode("text_specialist_node", textSpecialistNode, deps))
    .addNode("vision_specialist_node", wrapNode("vision_specialist_node", visionSpecialistNode, deps))
    .addNode("audio_specialist_node", wrapNode("audio_specialist_node", audioSpecialistNode, deps))
    .addNode("kb_specialist_node", wrapNode("kb_specialist_node", kbSpecialistNode, deps))
    .addNode("synthesizer_node", wrapNode("synthesizer_node", synthesizeNode, deps))
    .addNode("standard_action_node", wrapNode("standard_action_node", standardActionNode, deps))
    .addNode("escalation_action_node", wrapNode("escalation_action_node", escalationActionNode, deps))
    .addEdge(START, "ingest_node")
    .addEdge("ingest_node", "route_node")
    .addEdge("route_node", "text_specialist_node")
    .addEdge("route_node", "vision_specialist_node")
    .addEdge("route_node", "audio_specialist_node")
    .addEdge("route_node", "kb_specialist_node")
    .addEdge("text_specialist_node", "synthesizer_node")
    .addEdge("vision_specialist_node", "synthesizer_node")
    .addEdge("audio_specialist_node", "synthesizer_node")
    .addEdge("kb_specialist_node", "synthesizer_node")
    .addConditionalEdges(
      "synthesizer_node",
      (state: TriageGraphState) => {
        if (state.finalDecision && escalationSeverities.has(state.finalDecision.severity)) {
          return "escalation_action_node";
        }
        return "standard_action_node";
      },
      ["escalation_action_node", "standard_action_node"],
    )
    .addEdge("standard_action_node", END)
    .addEdge("escalation_action_node", END);

  return graph.compile({
    checkpointer: new MemorySaver(),
  });
}
