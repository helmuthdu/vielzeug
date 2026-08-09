import { PulseConnectionError, PulseDisposedError } from '../errors';
import { createPulse } from '../pulse';
import { frames, MockWebSocket, openPulse } from './_fixtures';

describe('createPulse lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does not construct a socket before connect()', () => {
    const pulse = createPulse('ws://test');

    expect(pulse.status.value).toBe('closed');
    expect(MockWebSocket.instances).toHaveLength(0);

    pulse.dispose();
  });

  it('resolves connect() only after the socket opens', async () => {
    const pulse = createPulse('ws://test');
    const connecting = pulse.connect();

    expect(pulse.status.value).toBe('connecting');
    expect(MockWebSocket.instances).toHaveLength(1);

    MockWebSocket.instances[0]!.open();
    await expect(connecting).resolves.toBeUndefined();
    expect(pulse.status.value).toBe('open');

    pulse.dispose();
  });

  it('throws instead of silently dropping messages before connection', () => {
    const pulse = createPulse('ws://test');

    expect(() => pulse.send('reply', { text: 'hello' })).toThrow(PulseConnectionError);

    pulse.dispose();
  });

  it('cancels a scheduled reconnect when disconnected', async () => {
    const { pulse, socket } = await openPulse({ reconnect: { delay: 100, maxAttempts: 2 } });

    socket.drop();
    expect(pulse.status.value).toBe('reconnecting');

    pulse.disconnect();
    await vi.advanceTimersByTimeAsync(100);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(pulse.status.value).toBe('closed');

    pulse.dispose();
  });

  it('clears remote session state before reconnecting from a closing socket', async () => {
    const { pulse, socket } = await openPulse();
    const joined = pulse.join('lobby');

    socket.receive({ room: 'lobby', type: 'joined' });
    await joined;

    MockWebSocket.deferClose = true;
    pulse.disconnect();

    expect(pulse.rooms.value).toEqual(new Set());

    const reconnecting = pulse.connect();
    const replacement = MockWebSocket.instances[1]!;

    replacement.open();
    await reconnecting;

    expect(frames(replacement)).toEqual([{ room: 'lobby', type: 'join' }]);
    expect(pulse.rooms.value).toEqual(new Set());

    socket.finishClose();
    pulse.dispose();
  });

  it('restores one active socket after an unexpected close', async () => {
    const { pulse, socket } = await openPulse({ reconnect: { delay: 10, maxAttempts: 1 } });

    socket.drop();
    await vi.advanceTimersByTimeAsync(10);

    expect(MockWebSocket.instances).toHaveLength(2);

    const replacement = MockWebSocket.instances[1]!;

    replacement.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(pulse.status.value).toBe('open');

    pulse.dispose();
  });

  it('reports terminal reconnect failure through onError', async () => {
    const onError = vi.fn();
    const { pulse, socket } = await openPulse({ onError, reconnect: { delay: 0, maxAttempts: 1 } });

    socket.drop();
    await vi.advanceTimersByTimeAsync(0);
    MockWebSocket.instances[1]!.drop();
    await vi.advanceTimersByTimeAsync(0);

    expect(pulse.status.value).toBe('closed');
    expect(onError).toHaveBeenCalledWith(expect.any(PulseConnectionError));

    pulse.dispose();
  });

  it('rejects connect() after disposal', async () => {
    const pulse = createPulse('ws://test');

    pulse.dispose();

    await expect(pulse.connect()).rejects.toBeInstanceOf(PulseDisposedError);
  });

  it('rejects an in-flight room operation when disposed', async () => {
    const { pulse } = await openPulse();
    const joining = pulse.join('lobby');

    pulse.dispose();

    await expect(joining).rejects.toBeInstanceOf(PulseDisposedError);
  });
});
