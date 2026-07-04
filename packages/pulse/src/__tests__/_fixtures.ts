import { createPulse } from '../pulse';

// ─── MockWebSocket ─────────────────────────────────────────────────────────────

export class MockWebSocket {
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances: MockWebSocket[] = [];

  readonly OPEN = MockWebSocket.OPEN;
  readonly CLOSING = MockWebSocket.CLOSING;
  readonly CLOSED = MockWebSocket.CLOSED;

  readyState: number = 0;
  url: string;
  sentMessages: string[] = [];

  onopen: (() => void) | null = null;
  onclose: ((ev: { code: number; reason: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }

  /** Simulate the server opening the connection. */
  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  /** Simulate a message arriving from the server. */
  receive(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  /** Simulate an unexpected close (e.g. network drop). */
  drop(code = 1006, reason = 'network error'): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }
}

export type ServerEvents = { greet: { name: string }; ping: void };
export type ClientEvents = { reply: { text: string } };

export function setup() {
  MockWebSocket.instances = [];

  const pulse = createPulse<ServerEvents, ClientEvents>('ws://test', {});

  const ws = MockWebSocket.instances[0]!;

  return { pulse, ws };
}
