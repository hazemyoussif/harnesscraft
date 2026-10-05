# Architecture review checklist

## Boundaries
- dependency direction is understandable;
- domain/application code is not coupled to UI/HTTP/database mechanics without reason;
- adapters translate external concepts instead of exporting raw provider semantics everywhere;
- shared utilities do not own business policy accidentally.

## Data
- source of truth is explicit;
- write ownership is explicit;
- derived data has a reconciliation/freshness story;
- transaction boundaries match business invariants;
- tenant and authorization filters cannot be skipped accidentally.

## Changeability
- likely changes are localized;
- abstractions correspond to real variation points;
- module APIs are smaller than module internals;
- replacing a provider does not require rewriting the domain.

## Operations
- external calls have timeouts and actionable errors;
- retries are safe or idempotent;
- background work has ownership and observability;
- failures do not silently corrupt state;
- rollout and rollback needs are understood.
