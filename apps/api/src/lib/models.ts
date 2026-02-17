import { ChatOllama } from "@langchain/ollama";
import type { AppConfig } from "./config";

export interface ModelSet {
  textModel: ChatOllama;
  visionModel: ChatOllama;
}

export function createModels(config: AppConfig): ModelSet {
  const textModel = new ChatOllama({
    baseUrl: config.ollamaBaseUrl,
    model: config.ollamaTextModel,
    temperature: 0.1,
  });

  const visionModel = new ChatOllama({
    baseUrl: config.ollamaBaseUrl,
    model: config.ollamaVisionModel,
    temperature: 0.1,
  });

  return {
    textModel,
    visionModel,
  };
}
