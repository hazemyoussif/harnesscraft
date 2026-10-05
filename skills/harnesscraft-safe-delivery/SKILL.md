---
name: harnesscraft-safe-delivery
description: Execute software changes in a controlled, reviewable way with characterization, focused verification, full quality gates, and explicit approval for consequential actions. Use when implementing, refactoring, fixing bugs, preparing releases, merging, deploying, or changing production-sensitive behavior.
---

# HarnessCraft Safe Delivery

Use a delivery loop that produces evidence early and limits blast radius.

## Delivery loop

1. Inspect repository guidance, current branch/state, relevant code, and tests.
2. Reproduce or characterize current behavior when changing existing logic.
3. State the intended behavioral change and likely regression surface.
4. Make the smallest coherent implementation.
5. Run the narrowest useful checks immediately.
6. Continue until the focused behavior is correct.
7. Run the repository's broader lint/type/test/build/architecture gates as applicable.
8. Inspect the final diff and repository state.
9. Report exact evidence: checks run, results, known omissions, branch/commit if relevant.

## Consequential operations

Explicit user approval is required before actions such as:

- merge or rebase that changes shared history/state;
- force push or hard reset;
- destructive cleanup;
- production deployment or rollback;
- destructive database/schema/data operations;
- package publishing or release publication;
- infrastructure destruction;
- secret/credential rotation or other externally consequential changes.

If the harness provides a confirmation gate, use it. On Pi, HarnessCraft's safety adapter adds a defense-in-depth prompt for recognized shell operations. A gate does not replace judgment.

## Verification discipline

Do not equate a green test command with task completion. Also check:

- the test actually exercises the requested behavior;
- authorization/tenancy/error paths where relevant;
- generated/configured artifacts if the change depends on them;
- accidental changes outside scope;
- whether the architecture moved responsibility into the wrong layer.

When a full gate cannot be run, say exactly why and what smaller evidence was obtained.
