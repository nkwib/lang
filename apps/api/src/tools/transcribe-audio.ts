import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { AppConfig } from "../lib/config";

const execFileAsync = promisify(execFile);

async function runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", ["-y", "-i", inputPath, "-ac", "1", "-ar", "16000", outputPath]);
}

async function runWhisper(
  whisperBin: string,
  modelPath: string,
  inputWavPath: string,
  outputBasePath: string,
): Promise<string> {
  await execFileAsync(whisperBin, [
    "-m",
    modelPath,
    "-f",
    inputWavPath,
    "-otxt",
    "-of",
    outputBasePath,
  ]);

  const transcriptPath = `${outputBasePath}.txt`;
  const content = await readFile(transcriptPath, "utf-8");
  return content.trim();
}

export function createTranscribeAudioTool(config: AppConfig) {
  return tool(
    async ({ audioPath }) => {
      const workDir = await mkdtemp(path.join(tmpdir(), "triage-audio-"));

      try {
        const normalizedPath = path.join(workDir, `${randomUUID()}.wav`);
        const outputBasePath = path.join(workDir, `${randomUUID()}-transcript`);

        await runFfmpeg(audioPath, normalizedPath);
        const transcript = await runWhisper(
          config.whisperBin,
          config.whisperModelPath,
          normalizedPath,
          outputBasePath,
        );

        return transcript;
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    },
    {
      name: "transcribe_audio",
      description:
        "Transcribe an audio file using local ffmpeg preprocessing and whisper.cpp CLI.",
      schema: z.object({
        audioPath: z.string().min(1),
      }),
    },
  );
}
