# ACP Developer Documentation

- `openapi.yaml` — OpenAPI 3.0 spec for every route `apps/api` exposes.
- `postman_collection.json` — importable Postman collection mirroring the
  spec. Set the `baseUrl` collection variable, register/login to get an
  `accessToken`, then set that as the `accessToken` variable.

## SDK

`@acp/sdk`'s `AcpClient` wraps the full API surface (see
`packages/sdk/src/acp-client.ts`). See `examples/quickstart` for a runnable
script.

## CLI

`@acp/cli` (bin name `acp`) wraps the same client for terminal use:

```
acp register <organizationName> <email> <password> [baseUrl]
acp login <organizationId> <email> <password> [baseUrl]
acp devices
acp analytics
acp logout
```

The session (access/refresh token, org ID, base URL) is stored at
`~/.acp/session.json`.

## Webhooks

Subscribe via `POST /webhooks` with a `url` and a list of event names
(`MessageCreated`, `MessageQueued`, `MessageSent`, `DeviceConnected`,
`DeviceDisconnected`). Deliveries are signed: verify the `x-acp-signature`
header as `HMAC-SHA256(secret, rawRequestBody)` using the `secret` returned
once at creation time (see `packages/webhooks/src/signing.ts` for the
reference implementation).
