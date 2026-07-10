import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@acp/types';
import { EventBus } from './index.js';

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

describe('EventBus', () => {
  it('delivers emitted events to subscribers', () => {
    const bus = new EventBus();
    let received: Message | undefined;

    bus.on('MessageCreated', (payload) => {
      received = payload;
    });

    bus.emit('MessageCreated', message);

    expect(received).toEqual(message);
  });

  it('unsubscribes via the returned function', () => {
    const bus = new EventBus();
    let calls = 0;

    const unsubscribe = bus.on('MessageCreated', () => {
      calls += 1;
    });

    unsubscribe();
    bus.emit('MessageCreated', message);

    expect(calls).toBe(0);
  });

  it('does not let a synchronously-throwing handler stop other subscribers from running', () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let secondHandlerCalled = false;

    bus.on('MessageCreated', () => {
      throw new Error('handler 1 failed');
    });
    bus.on('MessageCreated', () => {
      secondHandlerCalled = true;
    });

    bus.emit('MessageCreated', message);

    expect(secondHandlerCalled).toBe(true);
    errorSpy.mockRestore();
  });
});
