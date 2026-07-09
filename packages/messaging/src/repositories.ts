import type { Message, MessageStatus } from '@acp/types';

export interface MessageRepository {
  create(message: Message): Promise<Message>;
  findById(id: string): Promise<Message | undefined>;
  updateStatus(id: string, status: MessageStatus): Promise<void>;
}
