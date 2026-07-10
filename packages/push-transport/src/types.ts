export interface FcmConfig {
  readonly projectId: string;
  readonly clientEmail: string;
  readonly privateKey: string;
}

export interface ApnsConfig {
  readonly teamId: string;
  readonly keyId: string;
  readonly bundleId: string;
  readonly privateKey: string;
}

export type PushPlatform = 'android' | 'ios';

export interface PushConfigProvider {
  getFcmConfig(tenantId: string): Promise<FcmConfig | undefined>;
  getApnsConfig(tenantId: string): Promise<ApnsConfig | undefined>;
}

export class MissingPushConfigError extends Error {
  constructor(tenantId: string, platform: PushPlatform) {
    super(`No ${platform} push configuration set for tenant: ${tenantId}`);
    this.name = 'MissingPushConfigError';
  }
}

export class UnknownPushPlatformError extends Error {
  constructor(platform: string) {
    super(`Unknown push platform: ${platform}`);
    this.name = 'UnknownPushPlatformError';
  }
}

export interface PushNotification {
  readonly title: string;
  readonly body: string;
}

export interface PushSendResult {
  readonly providerRef?: string;
}

export type FetchLike = typeof fetch;
