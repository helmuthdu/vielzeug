export type MockWebSocketOptions = {
  /**
   * Open the socket automatically on the next macrotask instead of waiting for an
   * explicit `open()` call. Useful for consumers (demos, app-level tests) that
   * install the class as `globalThis.WebSocket` and never touch the instance.
   * @default false
   */
  readonly autoOpen?: boolean;
};

/**
 * A wire-protocol-accurate `WebSocket` stand-in for tests and demos: pulse dials it through
 * `new WebSocket(url, protocols)`, tests drive it through `open()`, `receive()`, `drop()`,
 * and `error()`, and every outbound frame lands in `sentMessages` for `frames()` to decode.
 *
 * Instances register on the static `instances` array in construction order, so a test can
 * grab the socket pulse just created without reaching into the client.
 */
export class MockWebSocket {
  static CLOSED = 3;
  static CLOSING = 2;
  static CONNECTING = 0;
  static deferClose = false;
  static OPEN = 1;
  static instances: MockWebSocket[] = [];

  readonly CLOSED = MockWebSocket.CLOSED;
  readonly CLOSING = MockWebSocket.CLOSING;
  readonly CONNECTING = MockWebSocket.CONNECTING;
  readonly OPEN = MockWebSocket.OPEN;

  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = MockWebSocket.CONNECTING;
  readonly sentMessages: string[] = [];
  readonly url: string;
  readonly protocols?: string | string[];

  constructor(url: string, protocols?: string | string[], options: MockWebSocketOptions = {}) {
    this.url = url;
    this.protocols = protocols;
    MockWebSocket.instances.push(this);
    if (options.autoOpen) setTimeout(() => this.open(), 0);
  }

  close(code = 1000, reason = ''): void {
    if (MockWebSocket.deferClose) {
      this.readyState = MockWebSocket.CLOSING;
      return;
    }

    this.finishClose(code, reason);
  }

  finishClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason } as CloseEvent);
  }

  drop(code = 1006, reason = 'network error'): void {
    this.close(code, reason);
  }

  error(): void {
    this.onerror?.(new Event('error'));
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  receive(frame: unknown): void {
    this.onmessage?.({ data: JSON.stringify(frame) } as MessageEvent);
  }

  send(frame: string): void {
    this.sentMessages.push(frame);
  }
}

/** Decodes every frame the socket sent, in order. */
export function frames(socket: MockWebSocket): Array<Record<string, unknown>> {
  return socket.sentMessages.map((frame) => JSON.parse(frame) as Record<string, unknown>);
}
