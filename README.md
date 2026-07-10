# AN Communications Platform (ACP)

> Enterprise-grade, self-hosted communications platform built with open-source technologies.

---

## Vision

ACP is a unified communications backend designed to power every application in the AN ecosystem.

Rather than building separate systems for SMS, Email, WhatsApp, Push Notifications, Telegram, Voice, and future communication channels, ACP provides a single, extensible platform with a common API and routing engine.

Every communication is represented internally as a **Message**.

The transport mechanism is only an implementation detail.

---

## Long-Term Goals

- Self-hosted
- Open Source First
- Vendor Independent
- Cloud Native
- Event Driven
- API First
- AI Ready
- Horizontally Scalable
- Enterprise Security
- Multi-Tenant

---

## Planned Communication Channels

| Channel | Status |
|----------|--------|
| SMS (Android Gateway) | Planned |
| SMS (GSM Modem) | Planned |
| Email | Planned |
| Push Notifications | Planned |
| WhatsApp | Planned |
| Telegram | Planned |
| Voice | Planned |
| Webhooks | Planned |
| Future AI Channels | Planned |

---

# Architecture

```
Applications

        │

        ▼

 API Gateway

        │

        ▼

 Message Orchestrator

        │

 ┌──────┼────────────┐

 ▼      ▼            ▼

SMS    Email     WhatsApp

 ▼      ▼            ▼

Transport Plugins
```

---

# Technology Stack

## Backend

- Node.js 24 LTS
- TypeScript
- NestJS
- Fastify
- Prisma
- PostgreSQL
- Redis
- BullMQ

## Dashboard

- Next.js
- React
- Tailwind CSS

## Android

- Kotlin
- Jetpack Compose
- WorkManager
- Room
- Retrofit
- WebSocket

## Infrastructure

- Docker
- Docker Compose
- Traefik
- Prometheus
- Grafana
- Loki
- MinIO

---

# Repository Structure

```
apps/
packages/
services/
infrastructure/
engineering/
docs/
tests/
tools/
templates/
.github/
```

---

# Core Principles

- Domain Driven Design
- Clean Architecture
- SOLID
- CQRS Ready
- Event Driven
- Type Safety
- Testability
- Observability
- Security by Default

---

# Engineering Workflow

1. Update engineering documentation.
2. Implement feature.
3. Write tests.
4. Verify build.
5. Update progress.
6. Commit.

No code is merged without passing all verification checks.

---

# Current Status

**v1.0 — M01 through M18 complete.**

Every milestone in `engineering/ACP_ROADMAP.md` has shipped and passes
`pnpm verify`. Read `engineering/PROGRESS.md`'s "what's real vs. what's
unverified" section before treating this as production-ready — a lot of
it has never touched live infrastructure, real cloud credentials, or a
real Android SDK.

See:

```
engineering/
```

for detailed architecture, roadmap, progress, and engineering documentation.

---

# License

License will be decided before the first public release.
