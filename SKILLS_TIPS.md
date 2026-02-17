# Skills: Quick Tips and Tricks

## What is a skill?

A skill is a small, reusable "playbook" for a specific type of work.  
It gives the agent:

- Clear trigger conditions (when to use it)
- A workflow (how to do the task)
- Optional reusable resources (`scripts/`, `references/`, `assets/`)

In this repo, skills live in:

- `/Users/gab/work/lang/.agents/skills`

## Why not just one `.md` file?

A plain Markdown file is passive documentation.  
A skill is operational guidance with structure.

Main differences:

1. Trigger-aware: skills can be selected when the request matches their purpose.
2. Progressive loading: short metadata first, detailed references only when needed.
3. Reusable tooling: scripts can make fragile steps deterministic.
4. Better consistency: same workflow every time for recurring tasks.
5. Easier scaling: many focused skills beat one giant "everything" doc.

## What skills do (and why that matters)

Skills reduce repeated reasoning and prevent partial edits.

They are best for:

- Repeated multi-file changes
- Debug flows with many touchpoints
- Tasks where sequence/order matters
- Work that needs strict validation steps

## Great examples in this project

1. `triage-graph-change`
- Use for graph topology, state, schema, prompt, and contract updates.

2. `multimodal-ingest-debug`
- Use for text/image/audio ingest failures and whisper/ffmpeg issues.

3. `kb-retrieval-tuning`
- Use for poor KB hint quality, empty retrieval, or embedding config issues.

4. `run-trace-investigation`
- Use for run lifecycle/event/trace debugging and status mismatches.

## Tips and tricks

1. Keep each skill narrow and specific.
2. Put "when to use this" in the frontmatter `description`.
3. Keep `SKILL.md` short; move details to `references/`.
4. Add scripts for brittle steps instead of rewriting commands every time.
5. Include exact validation commands in every skill.
6. Add "done criteria" so completion is objective.
7. Prefer 3 focused skills over 1 broad skill.
8. Iterate after real usage; skills improve fast with real failures.

## Simple prompt examples

- "Use `$triage-graph-change` to add a new specialist node."
- "Use `$multimodal-ingest-debug` to diagnose empty transcript warnings."
- "Use `$kb-retrieval-tuning` to improve hints for refund requests."
- "Use `$run-trace-investigation` to explain why this run failed."
