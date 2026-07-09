export interface SendableSocket {
  send(data: string): void;
}

/**
 * Maps an authenticated device to its live WebSocket connection so
 * server-initiated messages (e.g. "send this SMS") can reach it.
 */
export class ConnectionRegistry {
  private readonly sockets = new Map<string, SendableSocket>();

  register(deviceId: string, socket: SendableSocket): void {
    this.sockets.set(deviceId, socket);
  }

  unregister(deviceId: string): void {
    this.sockets.delete(deviceId);
  }

  get(deviceId: string): SendableSocket | undefined {
    return this.sockets.get(deviceId);
  }
}
