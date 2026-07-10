# AN Communications Platform (ACP)
# Engineering Roadmap

Version: 1.0.0

Status: Active

Last Updated: 2026-07-08

---

# Vision

Build the world's best self-hosted, open-source communications platform.

ACP will provide one unified API capable of sending, receiving, routing, scheduling, tracking, and analyzing communications across multiple channels.

Everything inside ACP revolves around one core entity:

**Message**

Every transport (SMS, Email, WhatsApp, Push, Voice, etc.) is implemented as a plugin.

---

# Release Strategy

ACP follows milestone-based development.

Every milestone must produce a working, testable system.

No milestone may leave the repository in a broken state.

---

# Version 0.1

Repository Foundation

Goal

Create the engineering foundation of ACP.

Deliverables

- Repository structure
- Turborepo
- pnpm Workspace
- TypeScript
- Docker
- GitHub Actions
- Engineering Documentation
- Build Tooling

Status

✅ Complete

---

# Version 0.2

Shared Packages

Deliverables

- Config
- Logger
- Database
- Shared Utilities
- Types
- Events
- Cache
- SDK Base

Status

✅ Complete

---

# Version 0.3

Infrastructure

Deliverables

- PostgreSQL
- Redis
- MinIO
- Traefik
- Prometheus
- Grafana
- Loki
- Docker Compose

Status

✅ Complete

---

# Version 0.4

Authentication

Deliverables

- Users
- Organizations
- API Keys
- JWT
- Refresh Tokens
- RBAC
- Device Tokens

Status

✅ Complete

---

# Version 0.5

Messaging Core

Deliverables

- Message Entity
- Templates
- Queue
- Retry Engine
- Scheduler
- Router
- Event Bus

Status

✅ Complete

---

# Version 0.6

Android Gateway

Deliverables

- Device Registration
- WebSocket
- Authentication
- Heartbeat
- SMS Sending
- SMS Receiving
- Delivery Reports

Status

🔄 In Progress (Device Registration, WebSocket, Authentication, Heartbeat, SMS Sending done via M09; inbound SMS/delivery-report forwarding from the Android app is still a TODO — see apps/android-gateway/README.md)

---

# Version 0.7

SMS Transport

Deliverables

- Android Gateway Transport
- GSM Modem Transport
- Multiple Device Routing
- Failover
- Priority Routing

Status

✅ Complete

---

# Version 0.8

Dashboard

Deliverables

- Authentication
- Device Monitoring
- Queue Monitoring
- Analytics
- Live Logs
- Message Tracking

Status

🔄 In Progress (Authentication, Device Monitoring, and Analytics done; Queue Monitoring and Live Logs still need backend endpoints — placeholder pages ship instead; Message Tracking overlaps with Analytics but per-message drill-down isn't built)

---

# Version 0.9

Developer Experience

Deliverables

- SDK
- CLI
- Documentation
- Examples
- Webhooks
- OpenAPI
- Postman Collection

Status

✅ Complete

---

# Version 1.0

Production Release

Deliverables

- Complete SMS Platform
- OTP
- Templates
- Scheduling
- Monitoring
- Security Hardening
- Performance Optimizations
- High Availability

Status

✅ Complete

---

# Future Releases

## Email

SMTP

IMAP

Domains

Templates

Attachments

Queue

---

## WhatsApp

Bridge

Business API Adapter

Templates

Media

---

## Push Notifications

Firebase

Apple Push Notification Service (APNs)

Scheduling

Topics

---

## Telegram

Bot API

Groups

Channels

Media

---

## Voice

SIP

Android Calling

IVR

Call Recording

---

## AI

Smart Routing

Cost Optimization

Spam Detection

Retry Prediction

Auto Scaling Recommendations

---

# Quality Gates

Every release must satisfy:

- Build Pass
- Lint Pass
- Type Check Pass
- Tests Pass
- Documentation Updated
- ADR Updated
- CI Pass
- Security Review

No exceptions.

---

# Repository Health

The repository should always remain in a deployable state.

Broken commits are not permitted.

---

# Success Metrics

ACP is considered successful when it can:

- Send millions of messages
- Scale horizontally
- Support multiple transports
- Remain vendor independent
- Be fully self-hosted
- Be understandable by a new engineer within one hour

---

# Current Focus

Current Version

1.0

Current Milestone

M18 Production Hardening

Current Sprint

Sprint 18

Current Objective

M01-M18 complete. Next: real infra validation (live Docker Compose smoke
test, live Postgres/Redis/BullMQ run), Android app verification on a
real SDK/emulator, and real provider credentials for Email/Push/
WhatsApp/Voice — everything this build could not verify in a sandbox
without those dependencies. See engineering/PROGRESS.md for the full
per-milestone list of what's genuinely unverified.
