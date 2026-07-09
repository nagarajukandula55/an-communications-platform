export interface DeadLetterEntry<T> {
  readonly payload: T;
  readonly reason: string;
  readonly failedAt: string;
}

export interface DeadLetterQueue<T> {
  push(payload: T, reason: string): Promise<void>;
}

export class InMemoryDeadLetterQueue<T> implements DeadLetterQueue<T> {
  readonly entries: DeadLetterEntry<T>[] = [];

  push(payload: T, reason: string): Promise<void> {
    this.entries.push({ payload, reason, failedAt: new Date().toISOString() });
    return Promise.resolve();
  }
}
