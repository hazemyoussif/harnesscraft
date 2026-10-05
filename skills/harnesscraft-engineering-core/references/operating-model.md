# Engineering operating model

## Evidence hierarchy

Prefer evidence in this order:

1. executable behavior and tests;
2. current contracts, schemas, configuration, and source code;
3. architecture/decision records that still match the code;
4. product/business requirements supplied by accountable stakeholders;
5. conventions and prior patterns;
6. intuition.

Do not promote a lower-confidence assumption to a fact because it makes implementation easier.

## Abstraction rule

Abstract when at least one of these is true:

- there are two real implementations that must vary behind one contract;
- an external dependency must be isolated from domain/application logic;
- the abstraction enforces a meaningful invariant;
- ownership/testing improves materially.

Do not abstract only because a future variation can be imagined.

## Refactoring rule

Refactor and behavior change should be separable when practical. If they must occur together, create stronger characterization coverage and keep the change mechanically reviewable.

## Production rule

"Works locally" is not production readiness. Production concerns include authorization, tenancy, observability, failure handling, migrations, compatibility, recovery, operational ownership, and rollback where applicable.
