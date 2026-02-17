import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyRequest } from "fastify";
import type { RunInput } from "../types/runtime";

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function extensionFromFileName(fileName: string | undefined): string {
  if (!fileName) {
    return ".bin";
  }

  const ext = path.extname(fileName);
  return ext || ".bin";
}

export async function parseRunInputFromRequest(
  request: FastifyRequest,
  tempDir: string,
): Promise<RunInput> {
  const runInput: RunInput = {};

  if (!(request as FastifyRequest & { isMultipart?: () => boolean }).isMultipart?.()) {
    const body = (request.body ?? {}) as { text?: unknown };
    runInput.text = normalizeText(body.text);
    return runInput;
  }

  await mkdir(tempDir, { recursive: true });

  const multipartRequest = request as FastifyRequest & {
    parts: () => AsyncIterable<
      | {
          type: "file";
          fieldname: string;
          filename?: string;
          mimetype: string;
          toBuffer: () => Promise<Buffer>;
        }
      | {
          type: "field";
          fieldname: string;
          value: unknown;
        }
    >;
  };

  for await (const part of multipartRequest.parts()) {
    if (part.type === "field") {
      if (part.fieldname === "text") {
        runInput.text = normalizeText(part.value);
      }
      continue;
    }

    if (part.type === "file") {
      if (part.fieldname === "image") {
        const imageBuffer = await part.toBuffer();
        runInput.imageBase64 = imageBuffer.toString("base64");
        runInput.imageMimeType = part.mimetype;
        continue;
      }

      if (part.fieldname === "audio") {
        const audioBuffer = await part.toBuffer();
        const ext = extensionFromFileName(part.filename);
        const fileName = `audio-${randomUUID()}${ext}`;
        const outputPath = path.join(tempDir, fileName);
        await writeFile(outputPath, audioBuffer);

        runInput.audioPath = outputPath;
        runInput.audioFileName = part.filename;
      }
    }
  }

  return runInput;
}
