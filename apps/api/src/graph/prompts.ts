import { ChatPromptTemplate } from "@langchain/core/prompts";

export const textSpecialistPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a support text analyst. Extract concise key points and risk flags from customer text. Respond with calibrated confidence.",
  ],
  ["human", "Customer text:\n{text}"],
]);

export const audioSpecialistPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are an audio transcript analyst for customer support triage. Extract key points and risk flags.",
  ],
  ["human", "Audio transcript:\n{transcript}"],
]);

export const kbSpecialistPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a support policy analyst. Turn knowledge hints into actionable support context.",
  ],
  ["human", "Knowledge hints:\n{hints}\n\nUser context:\n{textContext}"],
]);

export const synthesizePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are the triage coordinator. Merge specialist findings into one customer support triage decision with severity, sentiment, concise summary, evidence, and next action.",
  ],
  [
    "human",
    "Findings JSON:\n{findingsJson}\n\nKnowledge hints:\n{kbHints}\n\nText context:\n{textContext}\n\nTranscript context:\n{transcriptContext}",
  ],
]);
