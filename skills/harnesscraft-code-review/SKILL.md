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

## Evidence and requirements audit

Compare the diff and delivered behavior against the **original acceptance criteria**, not just the latest prompt or tests. Flag required capabilities silently postponed as enhancements. Verify that test assertions would fail against the prior defect where practical; distinguish shared-code agreement from independent reconciliation.

For performance-sensitive paths, examine data cardinality through joins and transformations, repeated I/O and worst-case complexity. Separate stage-specific timings from end-to-end results. For sensitive state, explicitly check fail-closed empty scopes, permission creation/revocation and cache propagation, financial semantic definitions and independent controls, tenant isolation, immutable history and cursor correctness.

## Passing tests are not a waiver
## Existing patterns and hardcoding review

Check whether the change duplicates an established utility, adapter, contract or supported dependency; introduces invented APIs or unsupported assumptions; hardcodes incidental tenant/environment/provider/business values; or forces a preferred architecture where the repository already has a compatible solution. Require evidence of a genuine gap before accepting a new pattern. Do not flag intentional, documented domain constants as hardcoding without showing why they are wrong.


A branch can have hundreds of passing tests and still have an architectural defect, missing authorization boundary, incorrect assumption, or untested failure mode. Treat tests as evidence, not authority.

If no meaningful defect is found, say so and identify residual risk or unverified areas rather than inventing findings.
