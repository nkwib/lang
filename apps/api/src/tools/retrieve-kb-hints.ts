import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SupportKnowledgeBase } from "../kb/knowledge-base";

export function createRetrieveKbHintsTool(knowledgeBase: SupportKnowledgeBase) {
  return tool(
    async ({ query, topK }) => {
      const cleanedQuery = query.trim();
      if (!cleanedQuery) {
        return [];
      }

      return knowledgeBase.search(cleanedQuery, topK ?? 3);
    },
    {
      name: "retrieve_kb_hints",
      description:
        "Retrieve short support policy hints from local markdown knowledge documents.",
      schema: z.object({
        query: z.string().min(1),
        topK: z.number().int().min(1).max(10).optional(),
      }),
    },
  );
}
