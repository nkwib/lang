import { z } from "zod";

export const specialistOutputSchema = z.object({
  keyPoints: z.array(z.string()).default([]),
  riskFlags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  rawExcerpt: z.string().optional(),
});

export type SpecialistOutput = z.infer<typeof specialistOutputSchema>;
