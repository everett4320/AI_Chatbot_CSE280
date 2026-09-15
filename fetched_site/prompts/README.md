# Prompt File Guide

Canonical Ross prompt used by default test scripts:
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

- By default, batch testing sends the canonical Ross prompt as `custom_prompt`.
- Use `--custom-prompt-file` only for an explicitly named experiment.
