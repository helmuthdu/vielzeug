import { createPulse } from '../pulse';
import type { ChannelDefinitions, MessageMap, PresenceDefinitions, PulseOptions } from '../types';

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

  constructor(
    readonly url: string,
    readonly protocols?: string | string[],
  ) {
    MockWebSocket.instances.push(this);
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

export type ServerEvents = { greet: { name: string }; notice: string };
export type ClientEvents = { reply: { text: string } };
export type Channels = {
  chat: {
    client: { send: { text: string } };
    server: { message: { text: string } };
  };
};
export type Presence = { lobby: { name: string } };

export async function openPulse<
  TServer extends MessageMap = ServerEvents,
  TClient extends MessageMap = ClientEvents,
  TChannels extends ChannelDefinitions = Channels,
  TPresence extends PresenceDefinitions = Presence,
>(options: PulseOptions = {}) {
  MockWebSocket.deferClose = false;
  MockWebSocket.instances = [];

  const pulse = createPulse<TServer, TClient, TChannels, TPresence>('ws://test', options);
  const connected = pulse.connect();
  const socket = MockWebSocket.instances[0]!;

  socket.open();
  await connected;

  return { pulse, socket };
}

export function frames(socket: MockWebSocket): Array<Record<string, unknown>> {
  return socket.sentMessages.map((frame) => JSON.parse(frame) as Record<string, unknown>);
}
