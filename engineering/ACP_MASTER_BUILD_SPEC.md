# AN Communications Platform (ACP)
## Master Build Specification
**Version:** 1.0.0
**Status:** Active
**Document Owner:** ACP Engineering
**Last Updated:** 2026-07-08

---

# 1. Purpose

This document is the authoritative engineering specification for the AN Communications Platform (ACP).

Every engineer, AI coding agent, reviewer, or automation tool must treat this document as the primary source of truth for architecture, development standards, and repository organization.

If implementation conflicts with this document, this document takes precedence until an Architecture Decision Record (ADR) explicitly changes it.

---

# 2. Vision

ACP is a self-hosted, enterprise-grade communications platform.

It provides a unified API for sending and receiving communications through multiple transport channels.

Initially supported transports:

- SMS
- Email
- Push Notifications
- Telegram
- WhatsApp
- Voice

Future transports must integrate without requiring changes to the platform core.

---

# 3. Core Principle

ACP is **Message-Centric**, not **Channel-Centric**.

Applications never interact directly with SMS, Email, or WhatsApp services.

Applications create a **Message**.

The platform determines:

- Routing
- Scheduling
- Retry strategy
- Delivery
- Analytics

---

# 4. Engineering Goals

- Open Source First
- Vendor Independent
- Self Hosted
- Horizontally Scalable
- Cloud Native
- Event Driven
- API First
- AI Ready
- Multi Tenant
- Production Ready

---

# 5. Non-Goals

ACP is NOT:

- A marketing automation platform
- A CRM
- A customer support platform
- A chatbot framework

Those systems should integrate with ACP instead.

---

# 6. Architecture

Applications

↓

API Gateway

↓

Authentication

↓

Message Orchestrator

↓

Transport Router

↓

Transport Plugin

↓

Provider

The provider may be:

- Android Gateway
- SMTP
- GSM Modem
- WhatsApp Bridge
- Push Provider

The orchestrator must not know implementation details.

---

# 7. Architectural Principles

## Clean Architecture

Every module must separate:

- Domain
- Application
- Infrastructure
- Presentation

---

## Domain Driven Design

Business rules belong in the domain.

Infrastructure never owns business logic.

---

## Dependency Rule

Dependencies always point inward.

Infrastructure depends on domain.

Never the opposite.

---

## Event Driven

Every meaningful action produces an event.

Examples:

- MessageCreated
- MessageQueued
- MessageDelivered
- DeviceConnected
- DeviceDisconnected

---

# 8. Repository Layout

apps/

packages/

services/

infrastructure/

engineering/

docs/

tests/

templates/

tools/

.github/

No feature may be implemented outside this structure without an ADR.

---

# 9. Shared Packages

Shared packages are reusable and framework-independent.

Planned packages include:

- config
- database
- logger
- events
- cache
- auth
- sdk
- shared
- testing
- types
- ui

---

# 10. Services

Services represent bounded contexts.

Planned services:

- Authentication
- Messaging
- Queue
- Routing
- SMS
- Email
- Analytics
- Webhooks
- Templates

Services communicate through events where practical.

---

# 11. Applications

Current applications:

apps/api

apps/dashboard

apps/android-gateway

Future applications must not duplicate business logic.

---

# 12. Engineering Standards

TypeScript Strict

No any

No disabled lint rules

No circular dependencies

No business logic in controllers

No database access from controllers

Validation required for every public endpoint.

---

# 13. Security

Security is mandatory.

Requirements:

JWT

API Keys

Device Tokens

HTTPS

Rate Limiting

Audit Logging

RBAC

Input Validation

Secrets Management

---

# 14. Observability

Every service must expose:

Health endpoint

Metrics endpoint

Structured logging

Tracing support

Readiness probe

Liveness probe

---

# 15. Testing Strategy

Every module requires:

Unit Tests

Integration Tests

End-to-End Tests (where applicable)

Critical infrastructure requires automated validation.

---

# 16. Documentation

Every milestone updates:

Architecture

Progress

Roadmap

ADR

Examples

API Documentation

No undocumented features.

---

# 17. Development Workflow

1. Update milestone document
2. Implement feature
3. Write tests
4. Verify build
5. Update progress
6. Commit
7. Review

---

# 18. AI Development

ACP is designed for AI-assisted development.

The repository must always contain enough documentation that a coding agent can continue development without external conversation history.

---

# 19. Milestones

M01 Repository Foundation

M02 Shared Packages

M03 Infrastructure

M04 Authentication

M05 Messaging Core

M06 Queue

M07 Device Management

M08 Android Gateway

M09 SMS Transport

M10 Dashboard

M11 OTP

M12 Analytics

M13 Email

M14 Push

M15 WhatsApp

M16 Voice

M17 SDK

M18 Production Hardening

---

# 20. Definition of Done

A milestone is complete only if:

- Builds successfully
- Tests pass
- Documentation updated
- Progress updated
- ADR updated (if required)
- Lint passes
- Type check passes
- CI passes

---

# 21. Guiding Philosophy

ACP should be built as infrastructure.

Every design decision should favor:

- Maintainability
- Extensibility
- Reliability
- Observability
- Security

Short-term convenience must never compromise long-term architecture.
