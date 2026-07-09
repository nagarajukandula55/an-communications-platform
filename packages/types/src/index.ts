export type Channel =
  | 'sms'
  | 'email'
  | 'whatsapp'
  | 'push'
  | 'telegram'
  | 'voice';

export type MessageStatus =
  | 'pending'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface Message {
  readonly id: string;
  readonly tenantId: string;
  readonly channel: Channel;
  readonly to: string;
  readonly from?: string;
  readonly body: string;
  readonly status: MessageStatus;
  readonly templateId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DeliveryReport {
  readonly messageId: string;
  readonly status: MessageStatus;
  readonly providerRef?: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly occurredAt: string;
}

export type DeviceStatus = 'online' | 'offline' | 'unknown';

export interface Device {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly status: DeviceStatus;
  readonly lastSeenAt?: string;
}

export interface AcpEventMap {
  MessageCreated: Message;
  MessageQueued: Message;
  MessageSent: Message;
  MessageDelivered: DeliveryReport;
  MessageFailed: DeliveryReport;
  DeviceConnected: Device;
  DeviceDisconnected: Device;
}

export type AcpEventName = keyof AcpEventMap;
