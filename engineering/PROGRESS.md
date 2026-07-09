# ACP Build Progress

Machine-readable-ish log of milestone completion for the automated build pipeline.
Each automated session must read this file first, resume at `Next Milestone`,
and update it before finishing.

---

## Status

- Current Version: 0.1
- Next Milestone: M02 Shared Packages
- Last Updated: 2026-07-09

---

## Completed

### M01 - Repository Foundation (2026-07-09)

- Turborepo + pnpm workspace + TypeScript base config
- ESLint, Prettier, EditorConfig, commitlint
- Repository layout created: apps/, packages/, services/, infrastructure/,
  engineering/, docs/, tests/, tools/, templates/, examples/, .github/
- GitHub Actions CI workflow (lint, typecheck, test, build)
- tools/doctor environment check script
- .env.example

---

## Automated Build Rules

1. Read `engineering/ACP_MASTER_BUILD_SPEC.md` and `engineering/ACP_ROADMAP.md` first.
2. Implement only the milestone listed as `Next Milestone` above.
3. Run `pnpm verify` (lint + typecheck + test + build). Do not proceed if it fails —
   fix or, if genuinely blocked, stop and leave notes under a `## Blocked` section here.
4. Update `engineering/ACP_ROADMAP.md` status for the milestone to Complete.
5. Append a dated entry under `## Completed` here and bump `Next Milestone`.
6. Commit and push to `claude/project-plan-estimate-chhv38`.
