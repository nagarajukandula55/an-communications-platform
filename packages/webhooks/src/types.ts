import type { Device, Message } from '@acp/types';

/**
 * Only events whose payload carries a tenantId are eligible for webhook
 * routing (we need to know which organization's subscriptions to fan
 * out to). MessageDelivered/MessageFailed carry a DeliveryReport
 * instead, which only has a messageId - routing those would need a
 * repository lookup from messageId back to tenantId, which isn't wired
 * up yet. Deliberately out of scope for this pass.
 */
export interface WebhookEventMap {
  MessageCreated: Message;
  MessageQueued: Message;
  MessageSent: Message;
  DeviceConnected: Device;
  DeviceDisconnected: Device;
}

export type WebhookEventName = keyof WebhookEventMap;

export const WEBHOOK_EVENT_NAMES: readonly WebhookEventName[] = [
  'MessageCreated',
  'MessageQueued',
  'MessageSent',
  'DeviceConnected',
  'DeviceDisconnected',
];

export interface WebhookSubscription {
  readonly id: string;
  readonly organizationId: string;
  readonly url: string;
  readonly events: readonly WebhookEventName[];
  readonly secret: string;
  readonly createdAt: string;
}
