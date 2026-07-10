import { describe, expect, it } from 'vitest';
import type { Message } from '@acp/types';
import type { ApnsSender } from './apns-sender.js';
import type { FcmSender } from './fcm-sender.js';
import { PushTransport } from './push-transport.js';
import {
  UnknownPushPlatformError,
  MissingPushConfigError,
  type ApnsConfig,
  type FcmConfig,
  type PushConfigProvider,
} from './types.js';

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    tenantId: 't1',
    channel: 'push',
    to: 'device-token',
    body: 'hello',
    status: 'queued',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

const fcmConfig: FcmConfig = {
  projectId: 'proj',
  clientEmail: 'sa@proj.iam.gserviceaccount.com',
  privateKey: 'irrelevant-for-fake-sender',
};
const apnsConfig: ApnsConfig = {
  teamId: 'team',
  keyId: 'key',
  bundleId: 'com.example.app',
  privateKey: 'irrelevant-for-fake-sender',
};

function configProvider(
  fcm?: FcmConfig,
  apns?: ApnsConfig,
): PushConfigProvider {
  return {
    getFcmConfig: () => Promise.resolve(fcm),
    getApnsConfig: () => Promise.resolve(apns),
  };
}

describe('PushTransport', () => {
  it('routes android messages to the FCM sender', async () => {
    const calls: unknown[] = [];
    const fakeFcm = {
      send: (config: FcmConfig, token: string, notification: unknown) => {
        calls.push({ config, token, notification });
        return Promise.resolve({ providerRef: 'fcm-ref' });
      },
    } as unknown as FcmSender;

    const transport = new PushTransport({
      configProvider: configProvider(fcmConfig, undefined),
      fcmSender: fakeFcm,
    });

    const result = await transport.send(
      message({ metadata: { platform: 'android', title: 'Hi' } }),
    );

    expect(result.providerRef).toBe('fcm-ref');
    expect(calls).toHaveLength(1);
  });

  it('routes ios messages to the APNs sender', async () => {
    const fakeApns = {
      send: () => Promise.resolve({ providerRef: 'apns-ref' }),
    } as unknown as ApnsSender;

    const transport = new PushTransport({
      configProvider: configProvider(undefined, apnsConfig),
      apnsSender: fakeApns,
    });

    const result = await transport.send(message({ metadata: { platform: 'ios' } }));
    expect(result.providerRef).toBe('apns-ref');
  });

  it('throws UnknownPushPlatformError when platform metadata is missing', async () => {
    const transport = new PushTransport({ configProvider: configProvider() });
    await expect(transport.send(message())).rejects.toBeInstanceOf(
      UnknownPushPlatformError,
    );
  });

  it('throws MissingPushConfigError when the platform has no config', async () => {
    const transport = new PushTransport({ configProvider: configProvider() });
    await expect(
      transport.send(message({ metadata: { platform: 'android' } })),
    ).rejects.toBeInstanceOf(MissingPushConfigError);
  });
});
