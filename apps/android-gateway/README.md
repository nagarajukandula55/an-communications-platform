# ACP Android Gateway

Kotlin/Jetpack Compose app that turns an Android phone into an SMS gateway
device for the AN Communications Platform.

## Status: unverified

This project was written without access to the Android SDK or an emulator —
there is no `ANDROID_HOME` in the sandbox this was built in, so **none of
this Kotlin code has been compiled, linted, or run**. Treat it as a
first draft. Before relying on it:

1. Open this directory in Android Studio (Koala/2024.1+ recommended).
2. Let it sync — this will pull the Android SDK, AGP 8.7.2, and all
   dependencies listed in `app/build.gradle.kts`.
3. Fix whatever the sync/build turns up. Likely candidates: exact AGP/Kotlin/
   Compose BOM version compatibility, the KSP version pin for the installed
   Kotlin version, and the adaptive icon placeholder (`ic_launcher_foreground.xml`
   is a plain vector, not a designed icon).
4. Grant runtime permissions (SMS, notifications) and test heartbeat/pairing
   against a running `apps/api` instance.

The Gradle wrapper (`gradlew`, `gradle/wrapper/*`) *was* generated for real
by a local Gradle install in the build sandbox, so that part is standard and
should work as-is; `distributionUrl` points at the real Gradle 8.9 download.

## What's implemented

- Pairing/heartbeat over WebSocket (`network/GatewayWebSocketClient.kt`),
  matching the protocol in `apps/api/src/gateway.ts`
  (`{type:"auth"|"heartbeat"}` -> `{type:"authenticated"|"heartbeat_ack"|"error"}`)
- Full bidirectional SMS transport: the backend's `send_sms` command is
  handled by `GatewayWebSocketClient.onMessage` and dispatched to
  `SmsSender` by `GatewayConnectionService`; `SmsDeliveryReceiver` updates
  the outbox row and reports the outcome back via `sms_result`; inbound SMS
  received on the device is forwarded to the backend via `sms_received`
  from `SmsReceiver`. Server-side, `apps/api/src/gateway.ts` +
  `inbound-sms-log.ts` + `GET /gateway/inbound-sms` make inbound messages
  observable.
- Foreground service (`network/GatewayConnectionService.kt`) keeping the
  socket alive, sending heartbeats every 30s, and exposing connection state
  as a `StateFlow<GatewayEvent>` (`GatewayConnectionService.events`)
- `ActiveGateway` (`network/ActiveGateway.kt`) holds the live
  `GatewayWebSocketClient`/`OutboxDao` reference so the OS-instantiated
  `SmsReceiver`/`SmsDeliveryReceiver` broadcast receivers can reach them
  without a bound-service round trip
- Room-backed outbox (`data/OutboxMessage.kt`, `OutboxDao.kt`) and a
  WorkManager job (`work/SendPendingMessagesWorker.kt`) that flushes
  anything queued while offline, every 15 minutes when network is available
- `SmsSender`/`SmsReceiver`/`SmsDeliveryReceiver` using the platform
  `SmsManager` and `Telephony.Sms` broadcast APIs
- DataStore-backed device credential storage (`data/DeviceCredentialsStore.kt`),
  populated by a manual-entry pairing screen in `MainActivity.kt`
  (device ID / token / gateway URL text fields, no QR scanning)
- The Compose UI (`ui/MainActivity.kt`) collects `GatewayConnectionService.events`
  and shows real connection status instead of a static placeholder

## What's explicitly NOT implemented

- QR-code pairing — pairing is manual text entry only; a camera-based QR
  flow (matching whatever the dashboard's device-registration UI emits)
  is a follow-up
- Inbound SMS persistence/routing beyond `InboundSmsLog`'s in-memory ring
  buffer — there is no `@acp/messaging` inbound-message concept yet, so
  `GET /gateway/inbound-sms` is an observability endpoint, not a durable
  inbox (see the doc comment on `InboundSmsLog`)
- Multi-tenant scoping on `/gateway/inbound-sms` — records aren't yet
  joined to `organizationId` (noted in `build-app.ts`)
- Delivery-status callbacks from the carrier (only the "handed to radio"
  result from `SmsManager` is captured, not final delivery reports)
