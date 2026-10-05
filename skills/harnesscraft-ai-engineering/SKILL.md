---
name: harnesscraft-ai-engineering
description: Design, implement, or review production LLM/agent features with bounded model responsibility, provider-neutral interfaces, structured contracts, deterministic validation, evaluation, and operational safeguards. Use for LLM planners, extraction, AI editing, RAG, agents, local-model integration, or model-provider architecture.
---

# HarnessCraft AI Engineering

Treat the model as a probabilistic component inside a deterministic product boundary.

## Bound the model's job

Use an LLM for tasks that benefit from language understanding, synthesis, classification, planning, or fuzzy retrieval. Keep deterministic rules in deterministic code.

Avoid giving the model final authority over:

- authentication/authorization decisions;
- tenant isolation;
- money/accounting invariants;
- destructive operations;
- unconstrained SQL or arbitrary code execution;
- schemas/contracts that can be validated deterministically.

## Contract-first model calls

Prefer:

1. a narrow input contract;
2. a narrow structured output schema;
3. provider-level structured output when available;
4. deterministic parsing/validation after the model;
5. explicit rejection/repair behavior for invalid output;
6. application-level policy checks after validation.

Do not solve an output-contract problem with increasingly elaborate prose prompts when a schema and validator can enforce it.

## Provider neutrality

Application code should depend on a model capability contract rather than a specific vendor SDK. Treat local OpenAI-compatible endpoints and hosted providers as peers behind the same boundary when their capabilities satisfy the contract.

Keep provider-specific concerns in adapters:

- base URL/authentication;
- model identifiers;
- structured-output dialect;
- streaming/tool-call differences;
- token/context limits;
- retry/rate-limit behavior.

Do not pretend providers are identical: capability differences belong in explicit metadata or adapter behavior, not hidden conditionals throughout the product.

## Agents and tools

Keep tool surfaces small. Add a tool when it supplies a missing capability or removes repeated expensive loops. Do not expose ten overlapping tools because they exist.

For local/smaller models, reduce advertised tools and persistent instructions before weakening the engineering rules.

## Evaluation

For production AI behavior, define representative fixtures and acceptance criteria. Evaluate more than "looks good":

- schema validity;
- factual/grounding errors where measurable;
- task success;
- regressions across prompts/models;
- latency and token cost;
- failure rate and recovery behavior.

Read `references/production-checklist.md` before declaring an AI feature production-ready.
