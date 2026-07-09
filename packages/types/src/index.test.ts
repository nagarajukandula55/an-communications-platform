import { describe, expect, it } from 'vitest';
import type { Message } from './index.js';

describe('types', () => {
  it('allows constructing a valid Message', () => {
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

    expect(message.channel).toBe('sms');
  });
});
