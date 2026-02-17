<script lang="ts">
  import { onDestroy } from "svelte";
  import type {
    FinalTriageDecision,
    RunAcceptedResponse,
    RunEvent,
    RunResultResponse,
    RunTraceResponse,
  } from "@media-triage/contracts";
  import { apiBaseUrl } from "$lib/config";

  let textInput = "";
  let imageFile: File | null = null;
  let audioFile: File | null = null;
  let audioFileSource: "upload" | "recording" | "none" = "none";
  let recordedAudioUrl = "";
  let mediaRecorder: MediaRecorder | null = null;
  let recordingStream: MediaStream | null = null;
  let recordingChunks: Blob[] = [];
  let isRecording = false;
  let runId: string | null = null;
  let submitting = false;
  let errorMessage = "";
  let runStatus: "idle" | "queued" | "running" | "completed" | "failed" = "idle";
  let runError = "";
  let events: RunEvent[] = [];
  let finalDecision: FinalTriageDecision | null = null;
  let actionPlan = "";
  let warnings: string[] = [];
  let trace: RunTraceResponse | null = null;
  let resultPollTimer: ReturnType<typeof setInterval> | null = null;

  function stopResultPolling() {
    if (resultPollTimer) {
      clearInterval(resultPollTimer);
      resultPollTimer = null;
    }
  }

  function clearRecordedAudioPreview() {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      recordedAudioUrl = "";
    }
  }

  function stopRecordingTracks() {
    if (recordingStream) {
      for (const track of recordingStream.getTracks()) {
        track.stop();
      }
      recordingStream = null;
    }
  }

  function clearAudioInput() {
    audioFile = null;
    audioFileSource = "none";
    clearRecordedAudioPreview();
  }

  function pickRecordingMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined") {
      return undefined;
    }

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];

    for (const mimeType of candidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    return undefined;
  }

  async function startAudioRecording() {
    if (isRecording) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      errorMessage = "In-browser recording is not supported by this browser.";
      return;
    }

    errorMessage = "";

    try {
      clearAudioInput();
      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecordingMimeType();
      mediaRecorder = mimeType
        ? new MediaRecorder(recordingStream, { mimeType })
        : new MediaRecorder(recordingStream);

      recordingChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        isRecording = false;

        const blobType = mediaRecorder?.mimeType || "audio/webm";
        const audioBlob = new Blob(recordingChunks, { type: blobType });
        recordingChunks = [];

        if (audioBlob.size === 0) {
          stopRecordingTracks();
          errorMessage = "Recording captured no audio data.";
          return;
        }

        clearRecordedAudioPreview();
        recordedAudioUrl = URL.createObjectURL(audioBlob);
        audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
          type: audioBlob.type || "audio/webm",
        });
        audioFileSource = "recording";
        stopRecordingTracks();
      };

      mediaRecorder.onerror = () => {
        isRecording = false;
        recordingChunks = [];
        stopRecordingTracks();
        errorMessage = "Recording failed. Please try again.";
      };

      mediaRecorder.start(250);
      isRecording = true;
    } catch (error) {
      isRecording = false;
      stopRecordingTracks();
      errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  function stopAudioRecording() {
    if (!mediaRecorder || !isRecording) {
      return;
    }

    mediaRecorder.stop();
  }

  onDestroy(() => {
    stopResultPolling();
    if (mediaRecorder) {
      mediaRecorder.onstop = null;
      mediaRecorder.onerror = null;
      if (isRecording) {
        mediaRecorder.stop();
      }
    }
    stopRecordingTracks();
    clearRecordedAudioPreview();
  });

  function resetRunState() {
    stopResultPolling();
    runId = null;
    runStatus = "idle";
    runError = "";
    events = [];
    finalDecision = null;
    actionPlan = "";
    warnings = [];
    trace = null;
    errorMessage = "";
  }

  function formatDuration(durationMs?: number): string {
    if (durationMs === undefined) {
      return "n/a";
    }

    if (durationMs < 1000) {
      return `${durationMs} ms`;
    }

    return `${(durationMs / 1000).toFixed(2)} s`;
  }

  async function fetchTrace(currentRunId: string): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/v1/runs/${currentRunId}/trace`);
    if (!response.ok) {
      return;
    }

    trace = (await response.json()) as RunTraceResponse;
  }

  async function fetchResult(currentRunId: string): Promise<RunResultResponse | null> {
    const response = await fetch(`${apiBaseUrl}/v1/runs/${currentRunId}/result`);
    if (!response.ok) {
      errorMessage = `Failed to fetch run result (${response.status}).`;
      return null;
    }

    const result = (await response.json()) as RunResultResponse;
    runStatus = result.status;
    finalDecision = result.finalDecision ?? null;
    actionPlan = result.actionPlan ?? "";
    warnings = result.warnings;
    runError = result.error ?? "";
    await fetchTrace(currentRunId);
    return result;
  }

  function startResultPolling(currentRunId: string) {
    stopResultPolling();
    resultPollTimer = setInterval(async () => {
      const result = await fetchResult(currentRunId);
      if (!result) {
        return;
      }

      if (result.status === "completed" || result.status === "failed") {
        stopResultPolling();
      }
    }, 1500);
  }

  function connectEventStream(currentRunId: string) {
    runStatus = "running";
    startResultPolling(currentRunId);
    const source = new EventSource(`${apiBaseUrl}/v1/runs/${currentRunId}/events`);

    source.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as RunEvent;
      events = [...events, parsed];

      if (parsed.eventType === "run_started") {
        runStatus = "running";
      }

      if (parsed.eventType === "run_completed" || parsed.eventType === "run_failed") {
        source.close();
        stopResultPolling();
        void fetchResult(currentRunId);
      }
    };

    source.onerror = () => {
      source.close();
      startResultPolling(currentRunId);
    };
  }

  async function submitRun() {
    resetRunState();

    const hasText = Boolean(textInput.trim());
    const hasImage = Boolean(imageFile);
    const hasAudio = Boolean(audioFile);

    if (!hasText && !hasImage && !hasAudio) {
      errorMessage = "Provide at least one input: text, image, or audio.";
      return;
    }

    submitting = true;

    try {
      const formData = new FormData();
      if (hasText) {
        formData.append("text", textInput.trim());
      }
      if (imageFile) {
        formData.append("image", imageFile, imageFile.name);
      }
      if (audioFile) {
        formData.append("audio", audioFile, audioFile.name);
      }

      const response = await fetch(`${apiBaseUrl}/v1/runs`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        errorMessage = `Run submission failed (${response.status}).`;
        return;
      }

      const accepted = (await response.json()) as RunAcceptedResponse;
      runId = accepted.runId;
      runStatus = accepted.status;
      connectEventStream(accepted.runId);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Media Triage POC</title>
</svelte:head>

<main>
  <section class="panel">
    <h1>Media Triage POC</h1>
    <p>LangGraph + LangChain TypeScript demo for multimodal support triage.</p>

    <label>
      Customer text
      <textarea
        bind:value={textInput}
        rows="5"
        placeholder="Describe the customer issue (optional if image/audio is provided)"
      ></textarea>
    </label>

    <label>
      Customer image (optional)
      <input
        type="file"
        accept="image/*"
        on:change={(event) => {
          const target = event.currentTarget as HTMLInputElement;
          imageFile = target.files?.[0] ?? null;
        }}
      />
    </label>

    <label>
      Customer audio (optional)
      <input
        type="file"
        accept="audio/*"
        on:change={(event) => {
          const target = event.currentTarget as HTMLInputElement;
          audioFile = target.files?.[0] ?? null;
          audioFileSource = audioFile ? "upload" : "none";
          clearRecordedAudioPreview();
        }}
      />
    </label>

    <div class="audio-recording-controls">
      <button
        type="button"
        disabled={submitting}
        on:click={isRecording ? stopAudioRecording : startAudioRecording}
      >
        {isRecording ? "Stop recording" : "Record audio"}
      </button>
      <button
        type="button"
        disabled={submitting || (!audioFile && !recordedAudioUrl)}
        on:click={clearAudioInput}
      >
        Clear audio
      </button>
    </div>

    {#if audioFile}
      <p class="meta">
        Audio ready: {audioFile.name}
        ({audioFileSource === "recording" ? "recorded in browser" : "uploaded"})
      </p>
    {/if}

    {#if recordedAudioUrl}
      <audio controls src={recordedAudioUrl}></audio>
    {/if}

    <button type="button" disabled={submitting || isRecording} on:click={submitRun}>
      {submitting ? "Submitting..." : isRecording ? "Stop recording to run" : "Run triage"}
    </button>

    {#if runId}
      <p class="meta">Current run: {runId} | status: {runStatus}</p>
    {/if}

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}

    {#if runError}
      <p class="error">Run failed: {runError}</p>
    {/if}
  </section>

  <section class="panel">
    <h2>Execution Trace</h2>
    {#if events.length === 0}
      <p>No events yet.</p>
    {:else}
      <ul>
        {#each events as event}
          <li>
            <span class="event-type">{event.eventType}</span>
            {#if event.node}
              <span class="node">{event.node}</span>
            {/if}
            {#if event.message}
              <span>{event.message}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="panel">
    <h2>Final Decision</h2>
    {#if finalDecision}
      <dl>
        <dt>Category</dt>
        <dd>{finalDecision.category}</dd>
        <dt>Severity</dt>
        <dd>{finalDecision.severity}</dd>
        <dt>Sentiment</dt>
        <dd>{finalDecision.sentiment}</dd>
        <dt>Summary</dt>
        <dd>{finalDecision.summary}</dd>
        <dt>Next action</dt>
        <dd>{finalDecision.nextAction}</dd>
        <dt>Confidence</dt>
        <dd>{finalDecision.confidence}</dd>
      </dl>

      <h3>Evidence</h3>
      <ul>
        {#each finalDecision.evidence as line}
          <li>{line}</li>
        {/each}
      </ul>
    {:else}
      <p>No decision yet.</p>
    {/if}

    {#if actionPlan}
      <h3>Action Plan</h3>
      <pre>{actionPlan}</pre>
    {/if}

    {#if warnings.length}
      <h3>Warnings</h3>
      <ul>
        {#each warnings as warning}
          <li>{warning}</li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="panel">
    <h2>Trace Summary</h2>
    {#if trace}
      <p class="meta">
        events: {trace.eventsCount} | total duration: {formatDuration(trace.totalDurationMs)}
      </p>

      {#if trace.nodes.length === 0}
        <p>No node trace data yet.</p>
      {:else}
        <ul>
          {#each trace.nodes as node (node.node)}
            <li>
              <strong>{node.node}</strong>
              <span class="node-status">{node.status}</span>
              <span class="node-duration">{formatDuration(node.durationMs)}</span>
              {#if node.warnings.length}
                <span class="node-warnings">{node.warnings.join(" | ")}</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    {:else}
      <p>No trace yet.</p>
    {/if}
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: "IBM Plex Sans", system-ui, sans-serif;
    background: linear-gradient(160deg, #f4f0e8, #e8f4f2);
    color: #1d2b2f;
  }

  main {
    max-width: 1080px;
    margin: 0 auto;
    padding: 2rem 1rem 3rem;
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .panel {
    background: white;
    border-radius: 12px;
    border: 1px solid #dce5e3;
    padding: 1rem;
    box-shadow: 0 8px 20px rgba(13, 33, 33, 0.08);
  }

  h1,
  h2,
  h3 {
    margin: 0 0 0.6rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }

  textarea,
  input,
  button {
    font: inherit;
  }

  textarea,
  input {
    border: 1px solid #b9c8c5;
    border-radius: 8px;
    padding: 0.5rem;
  }

  button {
    border: 0;
    border-radius: 8px;
    padding: 0.65rem 1rem;
    background: #0f766e;
    color: white;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .audio-recording-controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  audio {
    width: 100%;
    margin-bottom: 0.75rem;
  }

  .meta {
    font-family: "IBM Plex Mono", monospace;
    color: #4a6a68;
  }

  .error {
    color: #b91c1c;
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  li {
    margin-bottom: 0.35rem;
  }

  .event-type {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.8rem;
    color: #0f766e;
    margin-right: 0.35rem;
  }

  .node {
    font-family: "IBM Plex Mono", monospace;
    margin-right: 0.35rem;
    color: #334155;
  }

  .node-status {
    font-family: "IBM Plex Mono", monospace;
    margin-left: 0.45rem;
    color: #0f766e;
  }

  .node-duration {
    font-family: "IBM Plex Mono", monospace;
    margin-left: 0.45rem;
    color: #475569;
  }

  .node-warnings {
    margin-left: 0.45rem;
    color: #b91c1c;
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 0.75rem;
    row-gap: 0.4rem;
    margin: 0;
  }

  dt {
    font-weight: 600;
  }

  dd {
    margin: 0;
  }

  pre {
    white-space: pre-wrap;
    border: 1px solid #d0dbd9;
    border-radius: 8px;
    background: #f8faf9;
    padding: 0.6rem;
  }
</style>
