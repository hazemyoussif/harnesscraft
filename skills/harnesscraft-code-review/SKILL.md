---
name: harnesscraft-code-review
description: Review code or a diff for correctness, regressions, security, architecture ownership, maintainability, and verification quality. Use when asked to review a branch, PR, commit, implementation, or generated code rather than merely summarize it.
---

# HarnessCraft Code Review

Review for behavior and engineering quality, not stylistic preference.

## Review order

1. **Correctness:** does the implementation satisfy the intended behavior under normal and edge conditions?
2. **Regression risk:** what existing behavior can change unintentionally?
3. **Security and isolation:** authorization, tenant scoping, validation, injection, secrets, unsafe external effects.
4. **State and concurrency:** transaction boundaries, stale writes, idempotency, races, retries.
5. **Architecture ownership:** is the rule implemented in the correct layer/module? Did the change create coupling or abstraction debt?
6. **Failure behavior:** are external failures, partial work, timeouts, and invalid states handled deliberately?
7. **Verification quality:** do tests prove the important behavior, or just exercise the happy path?
8. **Maintainability:** naming, duplication, complexity, dead code, misleading comments, oversized interfaces.

## Findings

Prioritize findings by impact. For each meaningful issue, explain:

- what is wrong;
- when it manifests;
- why it matters;
- the smallest credible fix direction.

Do not inflate a review with low-value nits when substantive issues exist.

## Passing tests are not a waiver

A branch can have hundreds of passing tests and still have an architectural defect, missing authorization boundary, incorrect assumption, or untested failure mode. Treat tests as evidence, not authority.

If no meaningful defect is found, say so and identify residual risk or unverified areas rather than inventing findings.
