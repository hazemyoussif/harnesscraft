---
name: harnesscraft-architecture
description: Design or review software boundaries, modules, data flows, dependencies, and integration contracts. Use when deciding architecture, introducing abstractions, refactoring module ownership, or evaluating whether a system is becoming over- or under-structured.
---

# HarnessCraft Architecture

Architecture exists to make change safer and ownership clearer. Do not optimize for diagram elegance.

## Start from forces, not patterns

Before choosing an architecture, identify:

- business capabilities and invariants;
- data ownership and consistency needs;
- external systems and volatility points;
- security/tenant boundaries;
- scale and latency constraints that are evidenced rather than imagined;
- deployment/operational constraints;
- team ownership if relevant.

## Default stance

Prefer a well-modularized monolith until independent deployment, scaling, ownership, isolation, or failure-domain requirements justify distributed services.

Within an application:

- keep domain/application decisions independent of transport and persistence details;
- use repositories/adapters when there is a real data-source boundary or replacement requirement;
- keep APIs narrow and capability-oriented;
- prevent infrastructure objects from leaking through every layer;
- avoid "shared" modules that become unowned dumping grounds.

## Integration boundaries

When connecting databases, Odoo/ERP systems, custom APIs, queues, files, or third-party services:

1. define the source contract;
2. define normalization/semantic ownership;
3. isolate source-specific querying/authentication/retry behavior in an adapter;
4. expose a stable application-facing interface;
5. make source freshness and failure behavior observable.

Do not let one source's schema become the product's domain model unless that coupling is deliberate and documented.

## Decision records

Create an ADR when a decision has meaningful alternatives, consequences, or future reversal cost. Record context, decision, consequences, and rejected alternatives. Do not create ADRs for routine implementation details.

## Architecture review questions

- Does each important rule have an obvious owner?
- Can external dependencies change without rewriting unrelated business logic?
- Are boundaries enforcing invariants or merely adding files/interfaces?
- Is data ownership clear?
- Are cross-tenant/security boundaries visible in the architecture?
- Are retries/idempotency/transactions placed where their semantics are understood?
- Is complexity proportional to an evidenced need?

Read `references/review-checklist.md` for a deeper review pass.
