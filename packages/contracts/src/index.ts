import { z } from "zod";

export const runEventTypes = [
  "run_started",
  "node_started",
  "node_finished",
  "warning",
  "run_failed",
  "run_completed",
] as const;

export type RunEventType = (typeof runEventTypes)[number];

export const specialistSources = ["text", "vision", "audio", "kb"] as const;
export type SpecialistSource = (typeof specialistSources)[number];

export const severityLevels = ["low", "medium", "high", "critical"] as const;
export type SeverityLevel = (typeof severityLevels)[number];

export const sentimentLevels = ["negative", "neutral", "positive", "mixed"] as const;
export type SentimentLevel = (typeof sentimentLevels)[number];

export const actionLevels = ["reply", "request_info", "refund", "escalate"] as const;
export type ActionLevel = (typeof actionLevels)[number];

export interface CreateRunRequest {
  text?: string;
  imageFileName?: string;
  audioFileName?: string;
}

export interface RunAcceptedResponse {
  runId: string;
  status: "queued" | "running";
  createdAt: string;
}

export const specialistFindingSchema = z.object({
  source: z.enum(specialistSources),
  keyPoints: z.array(z.string()).default([]),
  riskFlags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  rawExcerpt: z.string().optional(),
});

export type SpecialistFinding = z.infer<typeof specialistFindingSchema>;

export const finalTriageDecisionSchema = z.object({
  category: z.string().min(1),
  severity: z.enum(severityLevels),
  sentiment: z.enum(sentimentLevels),
  summary: z.string().min(1),
  evidence: z.array(z.string()).default([]),
  nextAction: z.enum(actionLevels),
  confidence: z.number().min(0).max(1),
});

export type FinalTriageDecision = z.infer<typeof finalTriageDecisionSchema>;

export const runEventSchema = z.object({
  runId: z.string().min(1),
  eventType: z.enum(runEventTypes),
  timestamp: z.string().datetime(),
  node: z.string().optional(),
  message: z.string().optional(),
  payload: z.unknown().optional(),
});

export type RunEvent = z.infer<typeof runEventSchema>;

export interface RunResultResponse {
  runId: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt?: string;
  endedAt?: string;
  finalDecision?: FinalTriageDecision;
  actionPlan?: string;
  events: RunEvent[];
  warnings: string[];
  error?: string;
}

export interface NodeTrace {
  node: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  status: "running" | "completed" | "unknown";
  warnings: string[];
}

export interface RunTraceResponse {
  runId: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt?: string;
  endedAt?: string;
  totalDurationMs?: number;
  eventsCount: number;
  warnings: string[];
  nodes: NodeTrace[];
}
