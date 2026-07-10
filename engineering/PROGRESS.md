# ACP Build Progress

Machine-readable-ish log of milestone completion for the automated build pipeline.
Each automated session must read this file first, resume at `Next Milestone`,
and update it before finishing.

---

## Status

- Current Version: 1.0 + ANgroup SSO integration
- Next Milestone: none currently in progress — see "ANgroup SSO integration" below for what's done vs. still needed
- Last Updated: 2026-07-10

---

## ANgroup SSO integration (2026-07-10)

Real (not simulated) client against ANgroup's actual production SSO
contract, read directly from the ANgroup repo's source
(`src/app/api/sso/{token,verify}/route.ts`, `src/lib/auth/jwt.ts`,
`src/app/admin/sso/page.tsx`) rather than guessed.

**What ANgroup's SSO actually is:** the user logs into the ANgroup portal,
ANgroup itself calls its own `POST /api/sso/token` to mint a short-lived
(1h) HS256 JWT, then ANgroup links out to the consuming app with that
token attached (e.g. `.../sso/callback?token=...`). Consuming apps only
ever call the public `POST /api/sso/verify` to check a token - there is no
browser-redirect "login with ANgroup" page on ANgroup's side, so this app
never redirects there; it can only be *launched from* ANgroup once you're
already signed in.

Built:
- `packages/sso-client` (new) - `SsoClient.verify(token)` posts to
  ANgroup's `/api/sso/verify`, typed against the real response shape
  (`user.isSuperAdmin`, `businessIds`, `activeBusinessId`,
  `vendorMemberships`, etc). No shared secret needed client-side - ANgroup
  verifies its own signature and only ever hands back decoded claims.
- `packages/auth`: `User` gained `isSuperAdmin` (required) and
  `ssoUserId`/`Organization.ssoBusinessId` (optional). New
  `AuthService.ssoLogin()` finds-or-auto-provisions an organization
  (keyed by ANgroup businessId) and user (keyed by ANgroup userId) from a
  verified SSO payload, then issues a normal local session - downstream
  code doesn't need to know a session came from SSO. SSO-provisioned users
  get a password hash locked to an unguessable random value (via
  `hashPassword(generateId())`) since they must never be able to
  password-login.
- `apps/api`: new `POST /auth/sso/callback { ssoToken }` route, wired to
  `deps.sso` (a `SsoClient`, only constructed in `main.ts` when
  `ANGROUP_SSO_URL` is set - unset in local dev/tests, so nothing here
  changes behavior for non-ANgroup deployments). `POST /auth/login` now
  additionally checks `deps.sso && !session.user.isSuperAdmin` and returns
  `403 { ssoRequired: true }` in that case - enforcement lives at the API
  layer, not baked into `AuthService`, specifically so this package stays
  usable standalone outside the ANgroup ecosystem.
- `apps/dashboard`: `/sso/callback?token=...` page (posts to
  `/auth/sso/callback`, saves the session, redirects to `/devices`).
  `/login` page now labeled as the Super Admin break-glass form only, and
  surfaces the `ssoRequired` case with a clear message instead of a
  generic "invalid credentials."

**Provisioning the Super Admin break-glass account:** deliberately not
exposed via a public API - `POST /auth/register` always sets
`isSuperAdmin: false`. The one account allowed to skip SSO must be
created directly against the database (set `is_super_admin = true` on its
`users` row) by whoever operates the deployment, not through any app UI.

**Verified:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
all pass from a fully cold build state (all `dist/`, `.next/`, and
`*.tsbuildinfo` removed first, matching what CI does) - 95/95 turbo tasks
green. New tests: `packages/sso-client/src/client.test.ts` (3 tests,
mocked fetch against the real verify contract),
`packages/auth/src/auth-service.test.ts` (+5 tests for `ssoLogin`),
`apps/api/src/build-app.test.ts` (+4 tests for the callback route and the
login-gate behavior).

**Explicitly NOT done in this pass (needs a decision, not guessed at):**
1. **2FA "SSO-wide"** - since ANgroup is the single identity source for
   the whole ecosystem, 2FA has to live in ANgroup's own login, not in
   each consuming app. That means touching ANgroup's live production auth
   code (`angroup.in`), which needs its own careful, separately-reviewed
   change - not bundled silently into this pass. Proposed design (not yet
   built): TOTP-based, an `is2faEnabled`/`totpSecret` field on ANgroup's
   `User` model, a verify-code step inserted into ANgroup's existing
   login flow, and Super Admin accounts (`isSuperAdmin: true`) exempted
   per the user's explicit instruction. Needs the user's go-ahead before
   touching that repo's live auth path.
2. **an-mail-platform connection** - not merged or wired up yet. Recommended
   approach (from earlier in this session): add a 6th integration provider
   in `packages/integrations` that POSTs to an-mail-platform's existing
   `services/smtp` send API instead of raw SMTP, rather than copying code
   between repos (the sandbox's data-exfiltration guard blocks bulk
   copying a whole repo tree into another repo, confirmed when attempted).
3. **New merged "an-platform" monorepo** - not created. GitHub App
   integration lacks repo-creation write access (confirmed:
   `create_repository` → 403), same limitation as direct push. Would need
   the user to create the empty repo, or do the SSO/mail work directly in
   this repo instead (what was actually done here).

---

## v1.0: what's real vs. what's unverified

Every commit in this log passed `pnpm verify` (lint + typecheck + test +
build) at the time it was made — that's genuinely true throughout. But
"passes in this sandbox" is not the same as "proven correct in
production." Read this section before treating v1.0 as done-done:

- **Genuinely verified**: all TypeScript packages and `apps/api`/
  `apps/dashboard` — including a real `next build` every time the
  dashboard changed, a real end-to-end WebSocket test in `apps/api`
  (binds an actual port, connects a real `ws` client), real JWT
  signing with generated key pairs in the push-transport tests, and a
  real rate-limit test that hits `/auth/login` 6 times and checks for
  a 429 on the 6th.
- **Structurally complete, never run against live infra**: every
  `main.ts` wiring (Postgres, Redis/BullMQ, the full transport router)
  — this sandbox never had a live Postgres or Redis to connect to, so
  none of that has been exercised end-to-end. The M03 Docker Compose
  stack itself was only validated with `docker compose config`
  (schema/interpolation), never `docker compose up` (no Docker daemon
  in this sandbox, only the CLI).
- **Explicitly unverified by design, not oversight**: the Android app
  (`apps/android-gateway`) — no Android SDK in this sandbox, written per
  your explicit instruction to proceed anyway. See its README for what
  still needs building (inbound SMS/delivery-report forwarding, a
  pairing UI).
- **Can't be verified without real credentials**: the Email/Push/
  WhatsApp/Voice transports have real, tested logic (SMTP send via
  nodemailer, real FCM OAuth2 + APNs JWT signing, WhatsApp Cloud API,
  a generic voice-provider REST call) but none has ever talked to a
  real SMTP server, Firebase project, Apple account, WhatsApp Business
  account, or voice provider. That's what `/settings` in the dashboard
  is for — plug in real credentials and they should work, but "should"
  is doing real work in that sentence until someone tries it.

Before calling this a real v1.0: run `pnpm infra:up` and confirm the
Docker Compose stack actually comes up healthy; point `apps/api` at it
and confirm `main.ts` actually connects; open `apps/android-gateway` in
Android Studio and fix whatever the build turns up; and test each
channel transport against one real account per provider.

---

## Completed

### M18 - Production Hardening (2026-07-10)

- **Security**: `@fastify/helmet` (security headers — verified via a
  test checking `x-content-type-options: nosniff`), `@fastify/rate-limit`
  (100 req/min global, 5 req/min on `/auth/*` — verified with a real
  test that hits `/auth/login` 6 times and checks the 6th is a 429, not
  just checking the plugin is registered), JSON schema validation on
  auth request bodies (rejects malformed payloads before they reach
  `AuthService`), and a `pnpm audit --audit-level=high` step added to CI
  (non-blocking for now — `continue-on-error: true` — so it surfaces
  findings without breaking builds on transitive-dependency noise).
- **Monitoring**: `GET /metrics` on `apps/api` via `prom-client` —
  default Node process metrics plus `acp_http_requests_total` and
  `acp_http_request_duration_seconds` recorded on every request via an
  `onResponse` hook. This is exactly what M03's
  `infrastructure/observability/prometheus.yml` already expected at
  `acp-api:/metrics` — that job existed since M03 with nothing to
  scrape until now.
- **High Availability**: graceful shutdown in `main.ts` — `SIGTERM`/
  `SIGINT` close the Fastify server, the BullMQ queue connection, and
  the Postgres pool before exiting, instead of dropping in-flight
  requests and connections.
- **Performance**: not meaningfully addressed beyond what earlier
  milestones already had (Postgres connection pooling via `pg.Pool`,
  Redis-backed queue). No load testing was done — there's no running
  infra in this sandbox to load-test against.
- `buildApp()` gained an options parameter (`{ rateLimit?: boolean }`,
  default enabled) so tests can disable rate limiting for the many
  rapid requests a test suite makes, while production and the one
  dedicated rate-limit test both exercise it for real.
- apps/api now at 21 tests (3 new: metrics, helmet headers, rate limit).

### M17 - Developer Experience (2026-07-10)

- **SDK**: `@acp/sdk` split into `api-client.ts` (generic bearer-token
  helper, unchanged from M02) and a new `acp-client.ts` — `AcpClient`
  wraps every route `apps/api` exposes: `register`, `login`, `refresh`
  (no auth needed), `listDevices`, `getAnalytics`, `getIntegrationConfig`/
  `setIntegrationConfig` (auth needed). 7 tests.
- **CLI**: new `@acp/cli` package, bin name `acp` — `register`, `login`,
  `devices`, `analytics`, `logout` commands, session persisted at
  `~/.acp/session.json` via `FileSessionStore`. Verified for real: built
  `dist/bin.js` and ran it directly with `node` (shebang preserved,
  correct usage-error output), not just typechecked. 9 tests.
- **Webhooks**: new `@acp/webhooks` package — `WebhookDispatcher`
  subscribes to the shared `EventBus` for `MessageCreated`/`MessageQueued`/
  `MessageSent`/`DeviceConnected`/`DeviceDisconnected` (the events whose
  payload actually carries a `tenantId` — `MessageDelivered`/`MessageFailed`
  carry a `DeliveryReport` with only a `messageId`, so routing those would
  need an extra repository lookup that isn't wired up; documented as
  deliberately out of scope), looks up matching subscriptions per
  organization, and POSTs a signed payload (`x-acp-signature`:
  HMAC-SHA256, reusing the M05 `retry()` helper for delivery retries).
  Wired into `apps/api`: `GET`/`POST /webhooks`, `DELETE /webhooks/:id`
  (the plaintext secret is only ever returned once, at creation). 6
  dispatcher/signing tests, 2 new `apps/api` route tests (18 there now).
- **OpenAPI**: `docs/openapi.yaml`, one entry per real route including
  auth requirements and response codes; validated as parseable YAML.
- **Postman Collection**: `docs/postman_collection.json`, mirrors the
  OpenAPI spec; validated as parseable JSON.
- **Documentation**: `docs/README.md` ties SDK/CLI/webhooks/OpenAPI/
  Postman together.
- **Examples**: `examples/quickstart` — a real runnable script
  (`pnpm --filter @acp/example-quickstart start`) that registers an org
  against a live `apps/api` and prints devices/analytics.

### M13-M16 - Email, Push, WhatsApp, Voice (2026-07-10)

Built together since all four needed the same foundation: per-organization
provider credentials. That foundation landed as a separate commit just
before this one — `@acp/integrations` (AES-256-GCM at rest, Postgres +
in-memory repos, `GET`/`PUT /integrations/:provider` on `apps/api`, a
generic settings form on the dashboard driven by `INTEGRATION_FIELD_SPECS`
so a new provider field never needs new UI code).

**M13 Email** — `@acp/email-transport`: `EmailTransport` (channel `email`)
using `nodemailer`, `Mailer` interface for testability, subject taken from
`message.metadata.subject` or a default. 3 tests.

**M14 Push** — `@acp/push-transport`: `PushTransport` (channel `push`)
routes on `message.metadata.platform` (`'android'` -> `FcmSender`, `'ios'`
-> `ApnsSender`). Both senders are real implementations, not stubs:
- `FcmSender`: signs an RS256 JWT with the service account key, exchanges
  it for an OAuth2 access token at Google's token endpoint, then POSTs to
  the FCM v1 send API
- `ApnsSender`: signs an ES256 JWT (team ID + key ID), POSTs to Apple's
  HTTP/2 endpoint with the `apns-topic` header
- Tests use real generated RSA/EC key pairs (`crypto.generateKeyPairSync`)
  so the actual JWT signing code runs, with a fake `fetch` capturing the
  request. 8 tests total.

**M15 WhatsApp** — `@acp/whatsapp-transport`: `WhatsAppTransport` (channel
`whatsapp`) posts to the WhatsApp Cloud API (`messaging_product`,
`to`, `type: 'text'`). 3 tests.

**M16 Voice** — `@acp/voice-transport`: `VoiceTransport` (channel `voice`)
places a call via a generic REST voice-provider API (`message.body` as
the spoken/IVR script). Documented explicitly in `types.ts`: this is a
REST-gateway pattern like every major provider's public API (and what
self-hosted SIP gateways like Asterisk/FreeSWITCH expose too) —
hand-rolling a real SIP user agent (INVITE/ACK/BYE, SDP, RTP) is a
different scale of project and unverifiable without a real SIP trunk, so
it was not attempted. 3 tests.

All four transports are wired into `apps/api`'s `main.ts`, registered on
the shared `MessageRouter` alongside the SMS transport from M09, each
backed by an adapter reading its config from `IntegrationsService`.

17 new tests across the four channel packages; `@acp/integrations` added
6 more when it landed. Every one of these packages passes `pnpm verify`
(including two real `next build` re-runs after wiring the dashboard
settings page and confirming the `@acp/integrations/types` subpath split
didn't regress).

### M12 - Analytics (2026-07-10)

- New `@acp/analytics` package: `computeDeliveryStats()` (pure function —
  total, counts by `MessageStatus`, counts by `Channel`, optional date
  range filter), `InMemoryAnalyticsRepository` (tested), and
  `PostgresAnalyticsRepository` (two `GROUP BY` queries against the
  `messages` table `@acp/messaging` already created in M05 — no new
  schema needed)
- New `GET /analytics` on `apps/api`, auth-required via the same
  `requireAuth()` helper as `/devices`
- Dashboard's `/analytics` page is now real (was a placeholder since
  M10): fetches the endpoint, renders total + by-status + by-channel.
  `next build` still passes (verified, not just typechecked)
- 4 new `@acp/analytics` tests, 2 new `apps/api` tests (401 without a
  token, 200 with real stats) — `apps/api` now at 14 tests

### M11 - OTP (2026-07-09)

- `OtpService` added to `@acp/auth`, built on the M02 `@acp/cache`
  `CacheStore` (a perfect fit: OTPs are inherently short-TTL ephemeral
  data, no new Postgres table needed)
- `request(purpose, identifier)`: generates an N-digit code (default 6,
  via `crypto.randomInt` not `Math.random`), stores only its hash
  (reusing `hashApiKey`/`verifyApiKey` from M04 — generic token-hashing
  utilities, not API-key-specific) with a 5-minute default TTL, returns
  the plaintext code for the caller to actually deliver (SMS/email —
  wiring that up is a caller concern, not this service's)
- `verify(purpose, identifier, code)`: correct code deletes the entry
  and returns `true`; wrong code increments an attempt counter and
  returns `false`; exceeding `maxAttempts` (default 5) deletes the entry
  and throws `OtpAttemptsExceededError` — brute-forcing a 6-digit code
  is prevented by this attempt cap, not by hash cost, which is why a
  fast hash (sha256) is fine here unlike password hashing
- Codes are scoped by both `purpose` and `identifier` so e.g. a login
  OTP and a signup OTP for the same phone number don't collide
- 6 tests: length, verify-and-consume (one-time use), wrong code,
  purpose/identifier scoping, attempts-exceeded, and expiry (using a
  short TTL + real sleep rather than mocked timers, since `InMemoryCache`
  checks `Date.now()` internally)
- `@acp/auth` is now at 25 tests total across 6 files

### M10 - Dashboard (2026-07-09)

New `apps/dashboard`: Next.js 15 (App Router) + React 19 + Tailwind, real
`next build` verified (not just typecheck — actual static page generation
for all 7 routes) plus 5 vitest unit tests.

- `/login`: calls `POST /auth/login` on `apps/api`, stores the session in
  `localStorage` (`lib/session.ts`)
- `/devices`: calls the new `GET /devices` endpoint (auth-required, added
  to `apps/api` this milestone — `DeviceService.list()` +
  `requireAuth()` Bearer-token check), renders a status table with
  online/offline/unknown badges (`lib/device-status.ts`, unit tested)
- `/`, `/queue`, `/analytics`, `/logs`: honest placeholders, not fake
  data — each explicitly states which backend endpoint doesn't exist yet
  (Queue Monitoring, Analytics, and Live Logs all need API endpoints that
  weren't in scope for any milestone so far)
- Root `eslint.config.mjs` gained one exception: `postcss.config.mjs` is
  ignored by typed linting (it's a build-tool config file with no
  corresponding tsconfig entry, not app code)
- `apps/api` changes beyond the new route: `AppDeps` now requires an
  explicit `tokens: TokenService` (previously only reachable inside
  `AuthService`) so routes outside auth can verify bearer tokens; 12
  apps/api tests now (2 new: reject without token, list scoped to the
  authenticated org)

### M09 - SMS Transport (2026-07-09)

- New `@acp/sms-transport` package: `RoundRobinDeviceSelector` (priority/
  load-spreading across a tenant's online devices), `AndroidGatewayTransport`
  (implements the M05 `Transport` interface, dispatches via an injected
  `DeviceCommandDispatcher`), `GsmModemTransport` (AT-command based, behind
  an `AtCommandChannel` interface so it's testable without real modem
  hardware — no real serial implementation included, same reasoning as
  every other hardware/infra piece in this repo), and `CompositeSmsTransport`
  (tries transports in priority order, falls back on failure — this is
  the actual Failover + Priority Routing deliverable)
- `apps/api` wiring: `ConnectionRegistry` maps deviceId -> live WebSocket;
  `WsDeviceCommandDispatcher` implements `DeviceCommandDispatcher` by
  pushing a `send_sms` message down the device's socket and resolving a
  pending promise when the device replies with `sms_result` (with a
  15s timeout -> `SmsDispatchTimeoutError`)
- Extended the gateway WebSocket protocol (`gateway.ts`) both directions:
  server -> device `send_sms`, device -> server `sms_result`
  `{messageId, accepted, providerRef?, error?}`
- `buildApp()` now returns `{app, connections, smsDispatcher}` instead of
  just the Fastify instance, so callers (tests, `main.ts`) can reach the
  dispatcher/registry directly
- 10 new `@acp/sms-transport` tests, plus a new real end-to-end
  `apps/api` test that authenticates a device over an actual socket, calls
  `smsDispatcher.sendSms()`, asserts the device receives the correct
  `send_sms` payload, replies with `sms_result`, and asserts the dispatch
  promise resolves with the right `providerRef` — 11 apps/api tests total
- `main.ts` now wires the full chain: `MessageRouter` -> `AndroidGatewayTransport`
  -> `WsDeviceCommandDispatcher`, plus a `MessageService` backed by
  Postgres + BullMQ, ready for HTTP endpoints to call (not yet exposed —
  no `POST /messages` route exists yet, that's dashboard/SDK-adjacent
  work) and a worker process to actually consume the queue (needs
  `createMessageProcessor` from M06 run in `main.ts` or a separate
  process — not wired yet, same live-infra caveat as everything else)

### M08 - Android Gateway (2026-07-09)

Two halves: a backend WebSocket gateway service (verified, tested) and an
Android client app (unverified — see caveat below).

**Backend — `apps/api`** (new Fastify app):
- `POST /auth/register`, `/auth/login`, `/auth/refresh` wiring the M04
  `AuthService`
- `GET /gateway/ws`: WebSocket endpoint devices connect to. Protocol:
  client sends `{type:"auth",token}` then `{type:"heartbeat"}`; server
  replies `{type:"authenticated",deviceId}` / `{type:"heartbeat_ack"}` /
  `{type:"error",message}`. Auth failure and heartbeat-before-auth both
  close the connection.
- `gateway.ts`: the message-handling logic is a pure
  `handleGatewayMessage(deps, state, raw)` function so it's unit-testable
  without real sockets; `build-app.ts` is a thin adapter wiring it to
  `@fastify/websocket`
- Device tokens reuse `@acp/auth`'s generic `generateApiKey`/`hashApiKey`/
  `verifyApiKey` (they're just high-entropy-token hashing utilities, not
  API-key-specific) rather than duplicating that logic
- 9 tests: 5 for the pure message handler, 3 HTTP route tests via
  `fastify.inject`, and **1 real end-to-end test that binds an actual port
  and connects with a real `ws` client** (`gateway-ws.test.ts`) — this one
  actually exercises the socket handshake, not just the handler function
- `main.ts`: real entrypoint wiring Postgres-backed repositories; not
  covered by tests (needs a live Postgres, same as every other `main.ts`
  in this repo so far)

**Android client — `apps/android-gateway`** (new Kotlin/Compose app):
- Per user decision, written without Android SDK access in this sandbox
  (no `ANDROID_HOME`), so **zero compilation/lint/test verification** —
  see `apps/android-gateway/README.md` for the full caveat and what's
  still missing (inbound SMS forwarding, delivery report forwarding, a
  pairing UI, and wiring gateway events into the UI are all explicit
  TODOs, not oversights)
- The Gradle wrapper itself *is* real — generated by a local Gradle
  install in the sandbox, not hand-written, so `./gradlew` should work
  once you're on a machine with an Android SDK
- Structure: Jetpack Compose UI, a foreground `GatewayConnectionService`
  driving `GatewayWebSocketClient` (mirrors the backend protocol above),
  Room-backed outbox + WorkManager retry job, `SmsManager`/`Telephony`
  based send/receive, DataStore-backed credential storage

### M07 - Device Management (2026-07-09)

- New `@acp/devices` package: device registry, heartbeat, and
  staleness/offline detection (device *tokens* already exist in
  `@acp/auth` from M04 — this milestone is the device entity/lifecycle
  side, not auth)
- `DeviceService.register` (creates a device as `offline`),
  `.heartbeat` (marks `online`, emits `DeviceConnected` only on the
  offline -> online transition, not on every heartbeat), `.isStale`
  (pure function, configurable threshold, default 90s), and
  `.sweepStaleDevices` (flips stale `online` devices to `offline` and
  emits `DeviceDisconnected` per device) — the sweep is a plain
  function meant to be called from a scheduled job in `apps/api`, not a
  background timer baked into the package
- Repository interface + in-memory impl (tested) + Postgres impl on
  `@acp/database`, schema in `migrations.ts`
- 5 tests covering registration, connect/disconnect events, not-found,
  and staleness detection
- Explicitly NOT built here: the WebSocket transport devices actually
  connect over, and the Android client itself — those are M08 Android
  Gateway, a different tech stack (Kotlin/Android) this sandbox can't
  build or verify (Gradle is present but there's no Android SDK
  installed, `ANDROID_HOME` is unset).

### M06 - Queue (2026-07-09)

- `dead-letter-queue.ts`: `DeadLetterQueue<T>` interface + in-memory impl
  (used in tests); real usage backs onto the same Postgres/Redis chosen
  for the rest of the stack, not built as a separate infra piece here
- `message-processor.ts`: `createMessageProcessor(deps)` — the actual
  consumer-side logic for the `send-message` queue. On success: marks
  the message `sent`, emits `MessageSent`. On failure: asks the M05
  `RetryPolicy` whether to retry; if yes, re-enqueues with the computed
  backoff delay and an incremented attempt count; if attempts are
  exhausted, marks the message `failed`, pushes to the dead-letter
  queue, and emits `MessageFailed` with a `DeliveryReport`
  - Chose re-enqueue-with-backoff over BullMQ's built-in retry/backoff
    so the same `RetryPolicy` (and its tests) governs both the queue
    and any future non-BullMQ transport, keeping retry behavior in one
    place instead of split between our code and BullMQ config.
- 4 new tests covering the success, retry, exhaustion, and
  message-not-found paths — 17 tests total in `@acp/messaging` now
- Still not built: an actual `createBullMqWorker` process wired to
  `createMessageProcessor` and started somewhere (that's part of
  standing up `apps/api` as a real service, not a pure library concern)

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
