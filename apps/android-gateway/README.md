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
- Foreground service (`network/GatewayConnectionService.kt`) keeping the
  socket alive and sending heartbeats every 30s
- Room-backed outbox (`data/OutboxMessage.kt`, `OutboxDao.kt`) and a
  WorkManager job (`work/SendPendingMessagesWorker.kt`) that flushes
  anything queued while offline, every 15 minutes when network is available
- `SmsSender`/`SmsReceiver`/`SmsDeliveryReceiver` using the platform
  `SmsManager` and `Telephony.Sms` broadcast APIs
- DataStore-backed device credential storage (`data/DeviceCredentialsStore.kt`)

## What's explicitly NOT implemented (out of scope for M08)

- Actually wiring inbound SMS / delivery reports back to the backend
  (marked with `TODO(M09 SMS Transport)` in `SmsReceiver.kt` and
  `SmsDeliveryReceiver.kt`) — this app currently only logs them
- A pairing/QR-code UI flow to obtain the device token from `apps/api`
  (`DeviceCredentialsStore` has the storage, nothing populates it yet)
- Surfacing `GatewayEvent`s from the service back into the Compose UI
  (currently a static placeholder string in `MainActivity.kt`)
