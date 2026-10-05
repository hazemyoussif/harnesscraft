---
name: harnesscraft-engineering-core
description: Apply HarnessCraft's default engineering operating model when implementing, changing, debugging, or planning production software. Use when a coding task needs disciplined scoping, explicit assumptions, small reviewable changes, or evidence-based completion.
---

# HarnessCraft Engineering Core

Use this skill as the default engineering decision layer. It does not prescribe a framework or architecture. It constrains how decisions are made.

## Operating model

1. **Understand before changing.** Read the relevant code, tests, docs, configuration, and recent change context before editing. Do not infer unseen behavior from filenames or conventions.
2. **Separate facts from assumptions.** Identify what is known from code/data/contracts, what comes from business requirements, and what is only an implementation hypothesis.
3. **Prefer the smallest coherent change.** Solve the actual requirement without speculative generalization. A small change may still require a proper boundary if the requirement crosses one.
4. **Keep ownership explicit.** Domain rules belong with domain/application logic; adapters own external-system details; transport/UI code should not silently become the business-rule layer.
5. **Make deterministic things deterministic.** Use normal code, schemas, constraints, and tests for rules that do not require probabilistic reasoning.
6. **Design for failure where failure matters.** External calls, persistence, concurrency, authorization, retries, migrations, and background work need explicit failure behavior.
7. **Optimize from evidence.** Measure or reproduce before introducing performance complexity.
8. **Finish with evidence.** Passing tests are necessary, not sufficient. Verify the requested behavior, the relevant quality gates, and the final diff/architecture shape.

## Before implementation

Establish enough context to answer:

- What behavior exists now?
- What behavior is requested?
- Which assumptions are still unverified?
- Which module owns the rule?
- What is the smallest safe change boundary?
- What could regress even if the happy-path test passes?

If the repository exposes a compact repository-context tool, use it. On Pi, prefer `hc_repo_context`. Otherwise use the harness's native Git/shell tools.

## During implementation

- Change one coherent concern at a time.
- Preserve existing behavior unless the task intentionally changes it.
- Add characterization tests before risky refactors when behavior is unclear but relied upon.
- Avoid new abstractions until there are concrete variation points or ownership boundaries to support them.
- Keep interfaces narrow and names specific to the domain.
- Do not hide unresolved decisions behind TODOs unless the user explicitly accepts that debt.

## Completion standard

Before saying the work is done:

1. Run focused checks for the changed behavior.
2. Run the repository's broader required checks when practical.
3. Inspect the diff for accidental scope expansion, duplicated logic, dead code, and misplaced responsibility.
4. State what was verified and what was not.
5. Do not merge, deploy, publish, rewrite history, or make destructive production changes without explicit authorization.

For deeper decision rules, read `references/operating-model.md`.
