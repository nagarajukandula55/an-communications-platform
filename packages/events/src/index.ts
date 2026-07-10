import { EventEmitter } from 'node:events';
import type { AcpEventMap, AcpEventName } from '@acp/types';

export type EventHandler<K extends AcpEventName> = (
  payload: AcpEventMap[K],
) => void | Promise<void>;

function toListener<K extends AcpEventName>(
  handler: EventHandler<K>,
): (payload: AcpEventMap[K]) => void {
  return (payload) => {
    // A handler can fail two ways: throw synchronously, or return a
    // promise that rejects. Promise.resolve(handler(payload)) alone only
    // catches the second case - handler(payload) still runs eagerly and
    // a synchronous throw escapes before .catch() ever attaches.
    try {
      void Promise.resolve(handler(payload)).catch((error: unknown) => {
        console.error(error);
      });
    } catch (error) {
      console.error(error);
    }
  };
}

export class EventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  on<K extends AcpEventName>(event: K, handler: EventHandler<K>): () => void {
    const listener = toListener(handler);
    this.emitter.on(event, listener);

    return () => {
      this.emitter.off(event, listener);
    };
  }

  once<K extends AcpEventName>(event: K, handler: EventHandler<K>): void {
    this.emitter.once(event, toListener(handler));
  }

  emit<K extends AcpEventName>(event: K, payload: AcpEventMap[K]): void {
    this.emitter.emit(event, payload);
  }
}
