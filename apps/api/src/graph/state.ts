import { Annotation } from "@langchain/langgraph";
import type { FinalTriageDecision, SpecialistFinding } from "@media-triage/contracts";

export const TriageStateAnnotation = Annotation.Root({
  runId: Annotation<string>(),
  textInput: Annotation<string | undefined>(),
  imageBase64: Annotation<string | undefined>(),
  imageMimeType: Annotation<string | undefined>(),
  audioPath: Annotation<string | undefined>(),
  transcript: Annotation<string | undefined>(),
  hasText: Annotation<boolean>(),
  hasImage: Annotation<boolean>(),
  hasAudio: Annotation<boolean>(),
  kbQuery: Annotation<string | undefined>(),
  specialistFindings: Annotation<SpecialistFinding[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  kbHints: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  finalDecision: Annotation<FinalTriageDecision | undefined>(),
  actionPlan: Annotation<string | undefined>(),
  warnings: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
});

export type TriageGraphState = typeof TriageStateAnnotation.State;
