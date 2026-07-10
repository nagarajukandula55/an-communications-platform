import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@acp/events';
import type { Message } from '@acp/types';
import { WebhookDispatcher } from './dispatcher.js';
import { InMemoryWebhookRepository } from './memory-repository.js';
import { signPayload } from './signing.js';

const message: Message = {
  id: 'm1',
  tenantId: 't1',
  channel: 'sms',
  to: '+10000000000',
  body: 'hello',
  status: 'pending',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('WebhookDispatcher', () => {
  it('delivers a matching subscription with a valid signature', async () => {
    const repository = new InMemoryWebhookRepository();
    await repository.create({
      id: 'sub-1',
      organizationId: 't1',
      url: 'https://example.com/hook',
      events: ['MessageCreated'],
      secret: 'shh',
      createdAt: new Date().toISOString(),
    });

    const events = new EventBus();
    const requests: { url: string; body: string; signature: string | null }[] = [];
    const fetchFn: typeof fetch = (url, init) => {
      requests.push({
        url: url as string,
        body: init?.body as string,
        signature: new Headers(init?.headers).get('x-acp-signature'),
      });
      return Promise.resolve(new Response(null, { status: 200 }));
    };

    new WebhookDispatcher({ repository, events, fetchFn });
    events.emit('MessageCreated', message);

    await vi.waitFor(() => {
      expect(requests).toHaveLength(1);
    });

    const parsed = JSON.parse(requests[0]?.body ?? '{}') as {
      event: string;
      payload: Message;
    };
    expect(parsed.event).toBe('MessageCreated');
    expect(parsed.payload.id).toBe('m1');
    expect(requests[0]?.signature).toBe(signPayload('shh', requests[0]?.body ?? ''));
  });

  it('does not deliver to a subscription not subscribed to the event', async () => {
    const repository = new InMemoryWebhookRepository();
    await repository.create({
      id: 'sub-1',
      organizationId: 't1',
      url: 'https://example.com/hook',
      events: ['MessageSent'],
      secret: 'shh',
      createdAt: new Date().toISOString(),
    });

    const events = new EventBus();
    const fetchFn = vi.fn<typeof fetch>();

    new WebhookDispatcher({ repository, events, fetchFn });
    events.emit('MessageCreated', message);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('does not deliver to a subscription in a different organization', async () => {
    const repository = new InMemoryWebhookRepository();
    await repository.create({
      id: 'sub-1',
      organizationId: 'other-org',
      url: 'https://example.com/hook',
      events: ['MessageCreated'],
      secret: 'shh',
      createdAt: new Date().toISOString(),
    });

    const events = new EventBus();
    const fetchFn = vi.fn<typeof fetch>();

    new WebhookDispatcher({ repository, events, fetchFn });
    events.emit('MessageCreated', message);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('retries on failure and gives up silently after exhausting attempts', async () => {
    const repository = new InMemoryWebhookRepository();
    await repository.create({
      id: 'sub-1',
      organizationId: 't1',
      url: 'https://example.com/hook',
      events: ['MessageCreated'],
      secret: 'shh',
      createdAt: new Date().toISOString(),
    });

    const events = new EventBus();
    const fetchFn = vi.fn(() => Promise.resolve(new Response(null, { status: 500 })));

    new WebhookDispatcher({
      repository,
      events,
      fetchFn,
      retryAttempts: 2,
      retryBaseDelayMs: 5,
    });
    events.emit('MessageCreated', message);

    await vi.waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });
});
