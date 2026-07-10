# AN Communications Platform — Final Conclusions (as of 2026-07-10)

This document is the wrap-up snapshot for pausing work on this project. It
covers what's built, what's verified vs. unverified, and exactly what's left
before go-live.

## What's built

18 milestones complete (M01–M18), covering:

- Repo foundation, shared packages, infra, auth (M01–M04)
- Messaging core, queue, device management, Android gateway, SMS transport (M05–M09)
- Dashboard, OTP, analytics, integrations, email/push/WhatsApp/voice transports (M10–M16)
- Developer experience and production hardening / v1.0 (M17–M18)
- ANgroup SSO integration, webhooks management UI, an EventBus error-handling
  fix, and — this session — bidirectional SMS transport wiring end-to-end
  (backend `sms_received` protocol + full Android-side wiring)

## Verified vs. unverified

| Layer | Status |
|---|---|
| `apps/api` (Fastify backend, all `@acp/*` packages) | **Verified** — 80/80 turbo tasks green (lint, typecheck, test, build) as of this session, including the new gateway protocol tests |
| `apps/dashboard` (web UI) | Built and covered by prior sessions' CI runs; not re-verified this session |
| `apps/android-gateway` (Kotlin/Compose) | **Still unverified end-to-end.** No Android SDK or emulator is available in this sandbox, so none of the Kotlin code has ever been compiled, linted, or run on a device. This is a structural limitation of the environment, not a gap in the code review. |

## What changed this session

1. **Backend**: added a real `sms_received` message to the device gateway
   WebSocket protocol (`apps/api/src/gateway.ts`), a scoped `InboundSmsLog`
   observability class, and a `GET /gateway/inbound-sms` endpoint
   (`apps/api/src/build-app.ts`). This replaces a TODO that referenced a
   webhook that never existed.
2. **Android app** — closed all three gaps the README previously called out:
   - The server's `send_sms` command was silently dropped by
     `GatewayWebSocketClient` — fixed; it now dispatches to `SmsSender`.
   - `SmsReceiver`/`SmsDeliveryReceiver` only logged inbound SMS and delivery
     results — fixed; they now report over the WebSocket and update the
     Room outbox, via a new `ActiveGateway` holder.
   - The Compose UI showed a static placeholder string — fixed; it now
     collects real `GatewayEvent` state, and a minimal manual-entry pairing
     screen actually populates `DeviceCredentialsStore` (no QR scanning —
     that's still deferred, noted below).

## Known remaining gaps (by design, not oversight)

- **No Vercel deployment path for `apps/api`.** The gateway's core feature is
  a persistent WebSocket held open by each Android device; Vercel serverless
  functions can't hold long-lived connections. `apps/api` needs a normal
  persistent host (e.g. an Oracle Cloud VM, Railway, Fly.io).
- **QR-code pairing** is not implemented — pairing is manual text entry
  (device ID / token / gateway URL). A camera-scan flow is a follow-up.
- **Inbound SMS has no durable persistence** — `InboundSmsLog` is an
  in-memory ring buffer, not a database table, because `@acp/messaging` has
  no inbound-message concept yet. It's honestly documented as such in code.
- **`/gateway/inbound-sms` isn't organization-scoped yet** — fine for a
  single-tenant pilot, needs a deviceId→organizationId lookup before
  multi-tenant use.
- **Only "handed to radio" delivery status is captured**, not final
  carrier delivery reports.

## What's actually left before go-live

1. Pick and provision a persistent host for `apps/api` (Oracle Cloud VM or
   equivalent) — cannot be Vercel, see above.
2. Install Android Studio, sync `apps/android-gateway`, and fix whatever the
   first real compile turns up (likely candidates: AGP/Kotlin/Compose BOM
   version pins, the `ic_launcher_foreground.xml` placeholder icon).
3. Test the paired device end-to-end against a running `apps/api` instance:
   pairing, heartbeat, outbound `send_sms` → device → carrier, and inbound
   SMS → `sms_received` → `/gateway/inbound-sms`.
4. Decide whether QR pairing and durable inbound-message persistence are
   needed before pilot, or can ship after.

## Delivery

All changes in this session are committed locally on
`claude/project-plan-estimate-chhv38` (this sandbox has no push access to
`nagarajukandula55/an-communications-platform` — confirmed via a 403 on
`git push`). Delivered as a git bundle; see the accompanying message for
apply instructions.

This is a clean stopping point. Resuming later should start at "What's
actually left before go-live" above.
