# Production AI checklist

## Contract
- input/output schemas are versioned or evolution-safe;
- invalid model output has explicit handling;
- deterministic policy checks happen after the model where required.

## Provider
- timeout and cancellation behavior are defined;
- retries respect idempotency and rate limits;
- model/provider identity is observable for debugging and evaluation;
- local/remote endpoint configuration is externalized rather than embedded.

## Evaluation
- representative fixtures exist;
- baseline behavior is recorded before major prompt/model changes;
- evaluation distinguishes extraction/format accuracy from product-level success.

## Security
- untrusted retrieved/user content is not implicitly trusted as instruction;
- secrets are not unnecessarily placed in model context;
- model-generated queries/actions are constrained and validated;
- tenant context is enforced outside the model.

## Operations
- latency, error rate, invalid-output rate, and provider failures are observable;
- fallback behavior is explicit;
- product behavior under model unavailability is understood.
