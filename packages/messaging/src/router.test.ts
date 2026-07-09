import { describe, expect, it } from 'vitest';
import type { Message } from '@acp/types';
import { MessageRouter, NoTransportError } from './router.js';

const message: Message = {
  id: '1',
  tenantId: 't1',
  channel: 'sms',
  to: '+10000000000',
  body: 'hello',
  status: 'pending',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('MessageRouter', () => {
  it('routes a message to the registered transport for its channel', async () => {
    const router = new MessageRouter();
    router.register({
      channel: 'sms',
      send: () => Promise.resolve({ providerRef: 'ref-1' }),
    });

    const result = await router.route(message);
    expect(result.providerRef).toBe('ref-1');
  });

  it('throws NoTransportError when no transport is registered', async () => {
    const router = new MessageRouter();
    await expect(router.route(message)).rejects.toBeInstanceOf(
      NoTransportError,
    );
  });
});
