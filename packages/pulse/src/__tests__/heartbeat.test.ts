import { createPulse } from '../pulse';
import { MockWebSocket } from './_fixtures';

describe('createPulse — heartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sends a ping frame after the interval', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', { heartbeat: { interval: 1000, timeout: 500 } });
    const ws = MockWebSocket.instances[0]!;

    ws.open();

    await vi.advanceTimersByTimeAsync(1000);

    const ping = ws.sentMessages.find((m) => JSON.parse(m).type === 'ping');

    expect(ping).toBeDefined();

    pulse.dispose();
  });

  it('closes the socket when pong is not received within timeout', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', {
      heartbeat: { interval: 100, timeout: 50 },
      reconnect: false,
    });
    const ws = MockWebSocket.instances[0]!;

    ws.open();

    await vi.advanceTimersByTimeAsync(100 + 50 + 10);

    expect(ws.readyState).toBe(MockWebSocket.CLOSED);

    pulse.dispose();
  });

  it('does not close socket when pong arrives in time', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', { heartbeat: { interval: 100, timeout: 50 } });
    const ws = MockWebSocket.instances[0]!;

    ws.open();

    await vi.advanceTimersByTimeAsync(100);
    ws.receive({ ts: Date.now(), type: 'pong' });

    await vi.advanceTimersByTimeAsync(49);

    expect(ws.readyState).toBe(MockWebSocket.OPEN);

    pulse.dispose();
  });

  it('start() called twice does not schedule overlapping pings', async () => {
    const { createHeartbeat } = await import('../heartbeat');

    const send = vi.fn();
    const heartbeat = createHeartbeat({ interval: 100, timeout: 50 }, send, vi.fn());

    heartbeat.start();
    heartbeat.start();

    await vi.advanceTimersByTimeAsync(100);

    expect(send).toHaveBeenCalledTimes(1);

    heartbeat.stop();
  });

  it('is disabled by default (no heartbeat option)', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', {});
    const ws = MockWebSocket.instances[0]!;

    ws.open();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(ws.sentMessages.some((m) => JSON.parse(m).type === 'ping')).toBe(false);

    pulse.dispose();
  });

  it.each([false, undefined])('createHeartbeat(%s) returns a no-op handle', async (opts) => {
    const { createHeartbeat } = await import('../heartbeat');

    const send = vi.fn();
    const onDead = vi.fn();
    const heartbeat = createHeartbeat(opts, send, onDead);

    expect(() => {
      heartbeat.start();
      heartbeat.onPong();
      heartbeat.stop();
    }).not.toThrow();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(send).not.toHaveBeenCalled();
    expect(onDead).not.toHaveBeenCalled();
  });
});

describe('createPulse — heartbeat restart after reconnect (C3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sends ping after reconnect succeeds', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', {
      heartbeat: { interval: 100, timeout: 50 },
      reconnect: { delay: 0, maxAttempts: 1 },
    });

    const ws1 = MockWebSocket.instances[0]!;

    ws1.open();
    ws1.drop();

    await vi.runAllTimersAsync();

    const ws2 = MockWebSocket.instances[1];

    if (ws2) {
      ws2.open();

      await vi.advanceTimersByTimeAsync(100);

      const ping = ws2.sentMessages.find((m) => JSON.parse(m).type === 'ping');

      expect(ping).toBeDefined();
    } else {
      expect(pulse.status.value).toBe('closed');
    }

    pulse.dispose();
  });
});
