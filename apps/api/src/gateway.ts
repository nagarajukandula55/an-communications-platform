import {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  type DeviceTokenRepository,
} from '@acp/auth';
import type { DeviceService } from '@acp/devices';

export async function issueDeviceToken(
  deviceTokens: DeviceTokenRepository,
  organizationId: string,
  deviceId: string,
): Promise<string> {
  const generated = generateApiKey();
  await deviceTokens.create({
    id: crypto.randomUUID(),
    organizationId,
    deviceId,
    hashedToken: generated.hashed,
    createdAt: new Date().toISOString(),
  });
  return generated.plaintext;
}

export async function authenticateDeviceToken(
  deviceTokens: DeviceTokenRepository,
  plaintext: string,
) {
  const record = await deviceTokens.findByHash(hashApiKey(plaintext));
  return record && verifyApiKey(plaintext, record.hashedToken)
    ? record
    : undefined;
}

export type GatewayInboundMessage =
  | { readonly type: 'auth'; readonly token: string }
  | { readonly type: 'heartbeat' }
  | {
      readonly type: 'sms_result';
      readonly messageId: string;
      readonly accepted: boolean;
      readonly providerRef?: string;
      readonly error?: string;
    }
  | {
      readonly type: 'sms_received';
      readonly from: string;
      readonly body: string;
      readonly receivedAt: string;
    };

export type GatewayOutboundMessage =
  | { readonly type: 'authenticated'; readonly deviceId: string }
  | { readonly type: 'heartbeat_ack' }
  | { readonly type: 'error'; readonly message: string }
  | {
      readonly type: 'send_sms';
      readonly messageId: string;
      readonly to: string;
      readonly body: string;
    };

export interface GatewayConnectionState {
  deviceId?: string;
}

export interface SmsResultEvent {
  readonly accepted: boolean;
  readonly providerRef?: string;
  readonly error?: string;
}

export interface InboundSmsEvent {
  readonly from: string;
  readonly body: string;
  readonly receivedAt: string;
}

export interface GatewayDeps {
  readonly deviceTokens: DeviceTokenRepository;
  readonly devices: DeviceService;
  readonly onSmsResult?: (messageId: string, result: SmsResultEvent) => void;
  readonly onSmsReceived?: (deviceId: string, message: InboundSmsEvent) => void;
}

export interface GatewayResult {
  readonly reply?: GatewayOutboundMessage;
  readonly shouldClose?: boolean;
}

function parseInboundMessage(raw: string): GatewayInboundMessage | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'type' in parsed &&
      (parsed.type === 'auth' ||
        parsed.type === 'heartbeat' ||
        parsed.type === 'sms_result' ||
        parsed.type === 'sms_received')
    ) {
      return parsed as GatewayInboundMessage;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function handleGatewayMessage(
  deps: GatewayDeps,
  state: GatewayConnectionState,
  raw: string,
): Promise<GatewayResult> {
  const message = parseInboundMessage(raw);
  if (!message) {
    return { reply: { type: 'error', message: 'Invalid message' } };
  }

  if (message.type === 'auth') {
    const record = await authenticateDeviceToken(
      deps.deviceTokens,
      message.token,
    );
    if (!record) {
      return {
        reply: { type: 'error', message: 'Invalid device token' },
        shouldClose: true,
      };
    }
    state.deviceId = record.deviceId;
    return { reply: { type: 'authenticated', deviceId: record.deviceId } };
  }

  if (!state.deviceId) {
    return {
      reply: { type: 'error', message: 'Not authenticated' },
      shouldClose: true,
    };
  }

  if (message.type === 'heartbeat') {
    await deps.devices.heartbeat(state.deviceId);
    return { reply: { type: 'heartbeat_ack' } };
  }

  if (message.type === 'sms_result') {
    deps.onSmsResult?.(message.messageId, {
      accepted: message.accepted,
      ...(message.providerRef !== undefined ? { providerRef: message.providerRef } : {}),
      ...(message.error !== undefined ? { error: message.error } : {}),
    });
    return {};
  }

  deps.onSmsReceived?.(state.deviceId, {
    from: message.from,
    body: message.body,
    receivedAt: message.receivedAt,
  });
  return {};
}
