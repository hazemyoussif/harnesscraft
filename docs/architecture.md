# Architecture

## Thesis

HarnessCraft is not another universal agent framework. It is a portable engineering operating model plus small compatibility shims for coding harnesses.

The system separates three concerns:

```text
engineering judgment       capability implementation       installation
skills/*                    extensions/<harness>/*          scripts/harnesscraft.mjs
       \                           |                         /
        \________________ canonical repository ____________/
```

## Canonical skills

Skills use the Agent Skills `SKILL.md` format and are the source of truth for engineering behavior. They should be consumable by any compatible agent without generating another copy of the instructions.

A skill contains:

- activation guidance in frontmatter;
- decision rules and workflow in `SKILL.md`;
- optional deeper material in `references/`;
- optional deterministic helpers in `scripts/` only where the helper is genuinely reusable.

## Harness adapters

Adapters exist only for behavior that cannot be expressed well as a portable skill.

Pi is the first native adapter because its deliberately minimal base toolset benefits from a few compact capabilities:

- repository context aggregation;
- provider-neutral web search;
- confirmation gates around consequential shell operations.

Other harnesses should use their native capabilities when those capabilities are already strong.

## Profiles

Profiles select a subset of skills and adapter capabilities. They are not forks of the instructions.

The `local` profile is a first-class design target. Small/local models often benefit from fewer advertised tools and less always-on context, so profiles should reduce surface area before they reduce engineering standards.

## Installer

The installer copies canonical skills to the selected harness location. It records hashes of installed files. On update, a changed destination is treated as user-owned and is not overwritten unless the user explicitly requests force.

The generic `agents` target uses the cross-harness `.agents/skills` convention. Harness-specific targets are available for systems whose user-level discovery paths differ.

Pi package installation remains the preferred Pi route because Pi can consume both `skills/` and `extensions/` directly from one Git/npm package.

## Non-goals

HarnessCraft does not aim to:

- replace the coding harness;
- ship dozens of overlapping tools;
- encode project-specific conventions globally;
- make architectural decisions solely from generic rules;
- hide consequential operations from the user;
- require an MCP server for capabilities that native harness tools already provide.
