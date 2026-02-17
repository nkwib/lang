import type {
  FinalTriageDecision,
  RunEvent,
  RunEventType,
  SpecialistFinding,
} from "@media-triage/contracts";

export interface RunInput {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  audioPath?: string;
  audioFileName?: string;
}

export interface GraphRunResult {
  finalDecision?: FinalTriageDecision;
  actionPlan?: string;
  warnings: string[];
}

export interface RunRecord {
  runId: string;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  events: RunEvent[];
  warnings: string[];
  finalDecision?: FinalTriageDecision;
  actionPlan?: string;
  error?: string;
  listeners: Set<(event: RunEvent) => void>;
}

export interface RunEventInput {
  runId: string;
  eventType: RunEventType;
  node?: string;
  message?: string;
  payload?: unknown;
}

export interface SpecialistOutput {
  keyPoints: string[];
  riskFlags: string[];
  confidence: number;
  rawExcerpt?: string;
}

export interface TriageGraphState {
  runId: string;
  textInput?: string;
  imageBase64?: string;
  imageMimeType?: string;
  audioPath?: string;
  transcript?: string;
  hasText: boolean;
  hasImage: boolean;
  hasAudio: boolean;
  kbQuery?: string;
  specialistFindings: SpecialistFinding[];
  kbHints: string[];
  finalDecision?: FinalTriageDecision;
  actionPlan?: string;
  warnings: string[];
}
