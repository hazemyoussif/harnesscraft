# HarnessCraft repository guidance

HarnessCraft is skills-first. Treat Markdown skills as the canonical product and adapter code as secondary compatibility infrastructure.

## Rules

- Do not duplicate engineering guidance into harness-specific files.
- Keep every `skills/<id>/SKILL.md` valid as a standalone Agent Skill.
- Keep the skill directory name identical to its `name` frontmatter value.
- Descriptions must explain both what the skill does and when it should activate.
- Prefer progressive disclosure: detailed material belongs in `references/` rather than bloating `SKILL.md`.
- A skill must not require a HarnessCraft-specific tool unless it also states a native-tool fallback.
- Pi extensions must remain small and auditable. Avoid turning Pi into a large framework.
- Add a tool only when it removes repeated model/tool loops or supplies a capability the target harness lacks.
- Never add secrets, tokens, local paths, or user-specific project data to this repository.
- Installer changes must preserve user-modified files and remain reversible.

## Verification

Before reporting completion:

```bash
npm run check
```

If Pi adapter code changes, also inspect the current Pi extension/package documentation because its API evolves independently of this repository.
