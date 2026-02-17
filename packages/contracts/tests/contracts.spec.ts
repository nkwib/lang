import { describe, expect, it } from "vitest";
import {
  finalTriageDecisionSchema,
  runEventSchema,
  specialistFindingSchema,
} from "../src/index";

describe("contracts schemas", () => {
  it("validates specialist findings", () => {
    const parsed = specialistFindingSchema.parse({
      source: "text",
      keyPoints: ["customer cannot login"],
      riskFlags: ["repeat issue"],
      confidence: 0.8,
    });

    expect(parsed.source).toBe("text");
  });

  it("validates final decision", () => {
    const parsed = finalTriageDecisionSchema.parse({
      category: "account_access",
      severity: "medium",
      sentiment: "negative",
      summary: "User is locked out.",
      evidence: ["text says invalid code"],
      nextAction: "request_info",
      confidence: 0.75,
    });

    expect(parsed.category).toBe("account_access");
  });

  it("validates run events", () => {
    const parsed = runEventSchema.parse({
      runId: "run_123",
      eventType: "run_started",
      timestamp: new Date().toISOString(),
    });

    expect(parsed.eventType).toBe("run_started");
  });
});
