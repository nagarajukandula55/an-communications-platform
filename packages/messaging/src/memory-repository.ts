import type { Message, MessageStatus } from '@acp/types';
import type { MessageRepository } from './repositories.js';

export class InMemoryMessageRepository implements MessageRepository {
  private readonly messages = new Map<string, Message>();

  create(message: Message): Promise<Message> {
    this.messages.set(message.id, message);
    return Promise.resolve(message);
  }

  findById(id: string): Promise<Message | undefined> {
    return Promise.resolve(this.messages.get(id));
  }

  updateStatus(id: string, status: MessageStatus): Promise<void> {
    const existing = this.messages.get(id);
    if (existing) {
      this.messages.set(id, {
        ...existing,
        status,
        updatedAt: new Date().toISOString(),
      });
    }
    return Promise.resolve();
  }
}
