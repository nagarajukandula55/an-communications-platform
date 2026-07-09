# ACP Build Progress

Machine-readable-ish log of milestone completion for the automated build pipeline.
Each automated session must read this file first, resume at `Next Milestone`,
and update it before finishing.

---

## Status

- Current Version: 0.2
- Next Milestone: M03 Infrastructure
- Last Updated: 2026-07-09

---

## Completed

### M02 - Shared Packages (2026-07-09)

- 8 packages under `packages/`: types, shared, config, logger, events, cache,
  database, sdk — each with package.json, tsconfig, src/index.ts, and tests
- `@acp/types`: Channel/MessageStatus/Message/DeliveryReport/Device types and
  the `AcpEventMap` used across the platform
- `@acp/shared`: Result type, generateId, sleep, retry-with-backoff
- `@acp/config`: zod-validated environment config loader
- `@acp/logger`: structured JSON logger with levels and child bindings
- `@acp/events`: typed EventBus over node:events, async-safe handlers
- `@acp/cache`: CacheStore interface + InMemoryCache (Redis-backed impl
  deferred to M03 once Redis infra exists)
- `@acp/database`: thin `pg` Pool wrapper with health check (Prisma/schema
  work deferred to M04 Authentication)
- `@acp/sdk`: base `ApiClient` (fetch-based, bearer auth, ApiError)
- Fixed turbo.json: `typecheck` now depends on `^build` so workspace package
  type declarations exist before dependents typecheck against them
- `pnpm verify` (lint + typecheck + test + build) passes across all 8 packages

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
