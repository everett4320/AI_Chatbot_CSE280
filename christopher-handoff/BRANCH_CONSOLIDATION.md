# Branch consolidation record

This delivery preserves the useful work from the previously divergent project
branches without replaying already resolved conflicts.

## Canonical branches

At publication, these branches are intended to point to the commit containing
this record:

- `main`
- `codex/consolidate-branches`
- `codex/christopher-handoff`

`codex/christopher-handoff` is the branch to share with Christopher. `main` is
the team default. The consolidation branch is retained as an audit trail.

## Work included

- Everett's Figma-aligned Ross frontend is the UI baseline.
- The original Christopher handoff contributes the prompt, five-source catalog,
  API reference, deployment notes, and acceptance material.
- Mark's timeout/responsive work and later composer, ID-fallback, source-dedup,
  Quick Start, and screenshot work are included.
- Sadie's useful prompt and question-suite work is included with duplicate
  question IDs corrected.
- John's script intent is included without retaining survey exports.
- Later session isolation, stale-response protection, QA portability, and
  fixed-contract checks are included.

The old Christopher commits were patch-equivalent to copies already present in
the consolidated lineage. A normal merge would have replayed resolved frontend
and API conflicts. The safe publication method is therefore to validate the
consolidated tree and move the delivery branch to that exact tree with a
lease-protected update.

## Information preserved and excluded

No file from the earlier Christopher delivery was deleted by consolidation.
Legacy contributor branches remain available for history and attribution, but
they are not deployment baselines. Survey exports and local test output are
intentionally excluded because they are not Christopher delivery material and
may contain respondent data.

## Fixed integration boundary

The consolidation changes the frontend, local QA tooling, and documentation
only. Christopher's backend, server interaction, API behavior, model, retrieval
system, and AWS environment are fixed. Any future mismatch must be resolved in
the frontend adapter and its tests.
