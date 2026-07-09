# ACP Build Progress

Machine-readable-ish log of milestone completion for the automated build pipeline.
Each automated session must read this file first, resume at `Next Milestone`,
and update it before finishing.

---

## Status

- Current Version: 0.5
- Next Milestone: M06 Queue
- Last Updated: 2026-07-09

---

## Completed

### M05 - Messaging Core (2026-07-09)

- New `@acp/messaging` package: templates, retry policy, router, queue
  abstraction, message persistence, and `MessageService` orchestration
- `template.ts`: `{{variable}}` substitution, throws
  `MissingTemplateVariableError` on unset variables (fail loud instead of
  silently sending "Hi {{name}}")
- `retry-policy.ts`: pure `RetryPolicy` — exponential backoff with a cap,
  `decide(attempt)` / `isExhausted(attempt)`
- `router.ts`: `MessageRouter` maps `Channel` -> `Transport`; real
  SMS/Email/etc. transports land in M09/M13+ and register against this
  router rather than the orchestrator knowing about them directly (per
  the master spec's "orchestrator must not know implementation details")
- `queue.ts`: `MessageQueue<T>` interface with an `InMemoryMessageQueue`
  (used in tests) and a `BullMqMessageQueue`/`createBullMqWorker` backed
  by BullMQ + Redis for real use
- `MessageService.send()`: renders template or uses raw body, persists
  the message, emits `MessageCreated`/`MessageQueued` on the `@acp/events`
  bus, enqueues a `send-message` job (respecting `scheduledAt` as a
  queue delay), and updates status
- Message persistence: repository interface + in-memory impl (tested) +
  Postgres impl on `@acp/database` with schema in `migrations.ts`
- 13 tests across templates, retry policy, router, and MessageService;
  all packages pass `pnpm verify`
- Not built in this pass: no worker process actually consuming the
  BullMQ queue yet (that's the "Queue" milestone, M06), and no live test
  against a running Redis/BullMQ — same sandbox limitation as M03's
  Docker Compose validation.

### M04 - Authentication (2026-07-09)

- New `@acp/auth` package: domain logic for organizations, users, API keys,
  JWT access/refresh tokens, RBAC, and device tokens
- `AuthService`: `register` (new org + owner), `inviteUser` (add a member
  to an existing org, enforces per-org email uniqueness), `login`,
  `refresh` (rotates refresh tokens, revokes the old one), `createApiKey`
  / `verifyApiKey`
- Passwords hashed with bcryptjs; API keys and refresh tokens hashed with
  SHA-256 for fast lookup (they're high-entropy random tokens, not
  user-chosen secrets, so bcrypt's cost factor buys nothing there)
- `rbac.ts`: owner/admin/member permission matrix + `assertPermission`
- Repository interfaces with both an in-memory implementation (used in
  tests, no DB required) and a Postgres implementation on top of
  `@acp/database`; schema in `migrations.ts` (organizations, users,
  api_keys, refresh_tokens, device_tokens)
- Full unit test coverage for password hashing, tokens, RBAC, API keys,
  and the AuthService flows (register/login/refresh/invite/api-key)
- Caught and fixed a real bug during testing: `register()` always
  created a new organization, so the "email already in use" check could
  never fire through the public API. Split into `register` (first user,
  always succeeds) and `inviteUser` (subsequent users, where the
  uniqueness check is real) rather than shipping dead code.
- Not built in this pass: no HTTP layer yet (no `apps/api` routes wired
  up) — this milestone is the auth *domain package*; wiring it into an
  HTTP service happens alongside M05 Messaging Core when `apps/api`
  actually needs endpoints to serve.

### M03 - Infrastructure (2026-07-09)

- `infrastructure/docker/docker-compose.yml`: Postgres 17, Redis 7, MinIO,
  Traefik v3 (dashboard + docker provider), Prometheus, Loki, Grafana —
  all on a shared `acp` network with named volumes and healthchecks
- `infrastructure/observability/prometheus.yml`: scrapes Traefik and a
  placeholder `acp-api` job for when the API service exists (M04+)
- `infrastructure/observability/loki-config.yml`: filesystem-backed,
  single-node config suitable for local/dev
- `infrastructure/observability/grafana/provisioning/`: auto-provisions
  Prometheus + Loki datasources on Grafana startup
- Root scripts: `infra:up`, `infra:down`, `infra:logs`, `infra:config`
- Validated with `docker compose config` (env interpolation + schema);
  could not do a live `up`/health-check smoke test — no Docker daemon
  available in this sandbox, only the CLI. Recommend a live smoke test
  (`pnpm infra:up` then check container health) before relying on this
  in a real environment.

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
