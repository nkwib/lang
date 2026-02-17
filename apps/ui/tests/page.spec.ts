import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ui smoke", () => {
  it("contains key triage page sections", async () => {
    const filePath = path.resolve(import.meta.dirname, "../src/routes/+page.svelte");
    const content = await readFile(filePath, "utf-8");

    expect(content).toContain("Media Triage POC");
    expect(content).toContain("Execution Trace");
    expect(content).toContain("Final Decision");
  });
});
