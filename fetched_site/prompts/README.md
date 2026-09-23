# Prompt File Guide

Canonical Ross prompt used for clone configuration and explicit experiments:
- `christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt`

Legacy mirror retained for reference only:
- `fetched_site/prompts/custom_prompt.txt`

## TXT vs Markdown

- The model receives prompt content as plain text.
- File extension (`.txt` vs `.md`) does not change model capability by itself.
- What improves quality is prompt structure (clear sections, constraints, and explicit rules).

For this project, keep the canonical handoff prompt as the active file. The
legacy mirror must remain byte-identical when it is retained for reference.

## Editing Rules

- Keep prompts in English.
- Preserve the grounding constraints.
- Keep restricted-topic rules explicit (visa/immigration, scholarships/funding).
- Add a follow-up only when it helps the user move forward.

## How it is used

- By default, batch testing exercises the clone's configured backend prompt.
- Use `--custom-prompt-file` only for an explicitly named request-scoped experiment.
- A custom-prompt result does not prove persistent clone configuration.
