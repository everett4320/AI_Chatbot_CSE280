# Prompt File Guide

Primary prompt file used by test scripts:
- `fetched_site/prompts/custom_prompt.txt`

## TXT vs Markdown

- The model receives prompt content as plain text.
- File extension (`.txt` vs `.md`) does not change model capability by itself.
- What improves quality is prompt structure (clear sections, constraints, and explicit rules).

For this project, keep `custom_prompt.txt` as the active file to avoid changing existing script defaults.

## Editing Rules

- Keep prompts in English.
- Preserve non-negotiable grounding constraints.
- Keep restricted-topic rules explicit (visa/immigration, scholarships/funding).
- Keep the final guidance behavior explicit ("Would you like me to also...").

## How it is used

- If `custom_prompt.txt` is non-empty, batch testing sends it as `custom_prompt`.
- If it is empty, backend default prompt is used.
