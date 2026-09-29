import { createPulse } from '../pulse';
import { MockWebSocket } from '../testing/mock-websocket';
import type { PulseSchema } from '../types';

export { frames, MockWebSocket } from '../testing/mock-websocket';

export type TestSchema = PulseSchema & {
  server: { greet: { name: string }; notice: string };
  client: { reply: { text: string } };
  channels: {
    chat: {
      client: { send: { text: string } };
      server: { message: { text: string } };
    };
  };
  rooms: {
    lobby: { presence: { name: string } };
    announcements: Record<string, never>;
  };
};

export async function openPulse(options: Parameters<typeof createPulse<TestSchema>>[1] = {}) {
  MockWebSocket.deferClose = false;
  MockWebSocket.instances = [];

  const pulse = createPulse<TestSchema>('ws://test', options);
  const connected = pulse.connect();
  const socket = MockWebSocket.instances[0]!;

  socket.open();
  await connected;

  return { pulse, socket };
}
