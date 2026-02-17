import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { OllamaEmbeddings } from "@langchain/ollama";
import type { AppConfig } from "../lib/config";
import { withTimeout } from "../lib/async";

interface KnowledgeEntry {
  source: string;
  content: string;
  embedding: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;

  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    aNorm += a[i] * a[i];
    bNorm += b[i] * b[i];
  }

  if (!aNorm || !bNorm) {
    return 0;
  }

  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

export class SupportKnowledgeBase {
  private entries: KnowledgeEntry[] = [];
  private readonly embeddings: OllamaEmbeddings;
  private initError: string | null = null;

  constructor(private readonly config: AppConfig) {
    this.embeddings = new OllamaEmbeddings({
      baseUrl: this.config.ollamaBaseUrl,
      model: this.config.ollamaEmbedModel,
    });
  }

  async initialize(): Promise<void> {
    try {
      const files = await readdir(this.config.kbDir);
      const markdownFiles = files.filter((file) => file.endsWith(".md"));

      if (markdownFiles.length === 0) {
        this.initError = `No markdown KB files found in ${this.config.kbDir}`;
        return;
      }

      const contents: string[] = [];
      const sources: string[] = [];
      for (const file of markdownFiles) {
        const fullPath = path.join(this.config.kbDir, file);
        const content = await readFile(fullPath, "utf-8");
        contents.push(content);
        sources.push(file);
      }

      const vectors = await withTimeout(
        this.embeddings.embedDocuments(contents),
        this.config.kbInitTimeoutMs,
        "KB embedding initialization",
      );
      this.entries = contents.map((content, index) => ({
        source: sources[index],
        content,
        embedding: vectors[index],
      }));
      this.initError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.entries = [];
      this.initError = `Knowledge base initialization failed: ${message}`;
    }
  }

  async search(query: string, topK: number): Promise<string[]> {
    if (!this.entries.length) {
      return [];
    }

    const queryEmbedding = await withTimeout(
      this.embeddings.embedQuery(query),
      this.config.kbSearchTimeoutMs,
      "KB query embedding",
    );
    const ranked = this.entries
      .map((entry) => ({
        entry,
        score: cosineSimilarity(queryEmbedding, entry.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return ranked.map(({ entry }) => {
      const snippet = entry.content.replace(/\s+/g, " ").trim().slice(0, 240);
      return `[${entry.source}] ${snippet}`;
    });
  }

  getStatus(): { ready: boolean; error: string | null } {
    return {
      ready: this.entries.length > 0,
      error: this.initError,
    };
  }
}
