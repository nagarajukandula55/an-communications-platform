import { Queue, Worker } from 'bullmq';
import type { ConnectionOptions, Job, Processor } from 'bullmq';

export interface EnqueueOptions {
  readonly delayMs?: number;
  readonly attempts?: number;
}

export interface MessageQueue<T> {
  enqueue(jobName: string, payload: T, options?: EnqueueOptions): Promise<void>;
}

export class InMemoryMessageQueue<T> implements MessageQueue<T> {
  readonly jobs: { readonly name: string; readonly payload: T }[] = [];

  enqueue(
    jobName: string,
    payload: T,
    _options?: EnqueueOptions,
  ): Promise<void> {
    this.jobs.push({ name: jobName, payload });
    return Promise.resolve();
  }
}

export interface BullMqQueueOptions {
  readonly queueName: string;
  readonly connection: ConnectionOptions;
}

export class BullMqMessageQueue<T> implements MessageQueue<T> {
  private readonly queue: Queue<T, unknown, string, T, unknown, string>;

  constructor(options: BullMqQueueOptions) {
    this.queue = new Queue<T, unknown, string, T, unknown, string>(
      options.queueName,
      { connection: options.connection },
    );
  }

  async enqueue(
    jobName: string,
    payload: T,
    options: EnqueueOptions = {},
  ): Promise<void> {
    await this.queue.add(jobName, payload, {
      ...(options.delayMs !== undefined ? { delay: options.delayMs } : {}),
      attempts: options.attempts ?? 1,
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

export interface BullMqWorkerOptions {
  readonly queueName: string;
  readonly connection: ConnectionOptions;
}

export function createBullMqWorker<T>(
  options: BullMqWorkerOptions,
  processor: Processor<T>,
): Worker<T> {
  return new Worker<T>(options.queueName, processor, {
    connection: options.connection,
  });
}

export type { Job };
