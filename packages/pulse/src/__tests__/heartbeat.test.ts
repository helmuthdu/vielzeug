import { frames, MockWebSocket, openPulse } from './_fixtures';

describe('createPulse heartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sends a ping after the configured interval', async () => {
    const { pulse, socket } = await openPulse({ heartbeat: { interval: 10, timeout: 5 } });

    await vi.advanceTimersByTimeAsync(10);

    expect(frames(socket)).toContainEqual({ ts: expect.any(Number), type: 'ping' });

    pulse.dispose();
  });

  it('forces reconnection when pong does not arrive before the timeout', async () => {
    const { pulse, socket } = await openPulse({
      heartbeat: { interval: 10, timeout: 5 },
      reconnect: { delay: 0, maxAttempts: 1 },
    });

    await vi.advanceTimersByTimeAsync(15);
    await vi.runAllTimersAsync();

    expect(socket.readyState).toBe(MockWebSocket.CLOSED);
    expect(pulse.status.value).toBe('reconnecting');
    expect(MockWebSocket.instances).toHaveLength(2);

    pulse.dispose();
  });

  it('keeps the connection open when a pong arrives in time', async () => {
    const { pulse, socket } = await openPulse({ heartbeat: { interval: 10, timeout: 5 } });

    await vi.advanceTimersByTimeAsync(10);
    socket.receive({ ts: 1, type: 'pong' });
    await vi.advanceTimersByTimeAsync(4);

    expect(socket.readyState).toBe(MockWebSocket.OPEN);

    pulse.dispose();
  });
});
