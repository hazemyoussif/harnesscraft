# Contributing

HarnessCraft is intentionally opinionated and small. A contribution should strengthen a reusable engineering decision boundary or remove repeated harness friction.

Before adding a skill, ask whether the guidance is broadly reusable and meaningfully distinct from an existing skill. Before adding a tool, ask whether it supplies a capability the harness lacks or measurably removes repeated tool loops.

## Required checks

```bash
npm run check
```

For Pi adapter changes, also compare against the current Pi package/extension documentation before merging because Pi evolves independently.

## Skill changes

- Keep the directory name identical to `name` in frontmatter.
- Make the description say both what the skill does and when it activates.
- Keep the main `SKILL.md` concise; move deep guidance into `references/`.
- Do not make a portable skill depend exclusively on a HarnessCraft tool.
- Do not encode one company's project details into global guidance.

## Installer changes

Installer changes must preserve modified user files by default and remain reversible.
