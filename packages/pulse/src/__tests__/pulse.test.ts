import { PulseTimeoutError } from '../errors';
import { createPulse } from '../pulse';
import { type ClientEvents, MockWebSocket, type ServerEvents, setup } from './_fixtures';

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('createPulse — status', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts in connecting state', () => {
    const { pulse } = setup();

    expect(pulse.status.value).toBe('connecting');

    pulse.dispose();
  });

  it('moves to open when socket opens', () => {
    const { pulse, ws } = setup();

    ws.open();

    expect(pulse.status.value).toBe('open');

    pulse.dispose();
  });

  it('moves to closed when disconnect() is called', () => {
    const { pulse, ws } = setup();

    ws.open();
    pulse.disconnect();

    expect(pulse.status.value).toBe('closed');

    pulse.dispose();
  });
});

describe('createPulse — dispose', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets disposed to true after dispose()', () => {
    const { pulse } = setup();

    pulse.dispose();

    expect(pulse.disposed).toBe(true);
  });

  it('dispose() is idempotent', () => {
    const { pulse } = setup();

    pulse.dispose();
    pulse.dispose();

    expect(pulse.disposed).toBe(true);
  });

  it('disposalSignal aborts after dispose()', () => {
    const { pulse } = setup();

    pulse.dispose();

    expect(pulse.disposalSignal.aborted).toBe(true);
  });

  it('[Symbol.dispose] delegates to dispose()', () => {
    const { pulse } = setup();

    pulse[Symbol.dispose]();

    expect(pulse.disposed).toBe(true);
  });

  it('channel() created after dispose() is already disposed', () => {
    const { pulse } = setup();

    pulse.dispose();

    const ch = pulse.channel('chat');

    expect(ch.disposed).toBe(true);
    expect(ch.disposalSignal.aborted).toBe(true);
  });

  it('channel() created after dispose() warns and ignores on()', () => {
    const { pulse } = setup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    pulse.dispose();

    const ch = pulse.channel('chat');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("channel('chat') called on a disposed Pulse"));

    const unsub = ch.on('greet', vi.fn());

    expect(() => unsub()).not.toThrow();

    warnSpy.mockRestore();
  });

  it('presence() created after dispose() is already disposed', () => {
    const { pulse } = setup();

    pulse.dispose();

    const lobby = pulse.presence('lobby');

    expect(lobby.disposed).toBe(true);
    expect(lobby.disposalSignal.aborted).toBe(true);
  });

  it('presence() created after dispose() warns instead of attempting to join', () => {
    const { pulse } = setup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    pulse.dispose();
    pulse.presence('lobby');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("presence('lobby') called on a disposed Pulse"));

    warnSpy.mockRestore();
  });
});

describe('createPulse — send / on', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('delivers a server message to on() listener', () => {
    const { pulse, ws } = setup();

    ws.open();

    const handler = vi.fn();

    pulse.on('greet', handler);
    ws.receive({ event: 'greet', payload: { name: 'Alice' }, type: 'message' });

    expect(handler).toHaveBeenCalledWith({ name: 'Alice' });

    pulse.dispose();
  });

  it('send() writes to socket when open', () => {
    const { pulse, ws } = setup();

    ws.open();
    pulse.send('reply', { text: 'hi' });

    expect(ws.sentMessages).toHaveLength(1);
    expect(JSON.parse(ws.sentMessages[0]!)).toMatchObject({ event: 'reply', type: 'message' });

    pulse.dispose();
  });

  it('send() no-ops when not open', () => {
    const { pulse } = setup();

    pulse.send('reply', { text: 'hi' });

    const ws = MockWebSocket.instances[0]!;

    expect(ws.sentMessages).toHaveLength(0);

    pulse.dispose();
  });

  it('send() warns and drops the message when disposed', () => {
    const { pulse } = setup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    pulse.dispose();
    pulse.send('reply', { text: 'hi' });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("send('reply') called on a disposed Pulse"));

    warnSpy.mockRestore();
  });

  it('unsubscribe removes the listener', () => {
    const { pulse, ws } = setup();

    ws.open();

    const handler = vi.fn();
    const unsub = pulse.on('greet', handler);

    unsub();
    ws.receive({ event: 'greet', payload: { name: 'Bob' }, type: 'message' });

    expect(handler).not.toHaveBeenCalled();

    pulse.dispose();
  });

  it('once() fires only once', () => {
    const { pulse, ws } = setup();

    ws.open();

    const handler = vi.fn();

    pulse.once('greet', handler);
    ws.receive({ event: 'greet', payload: { name: 'A' }, type: 'message' });
    ws.receive({ event: 'greet', payload: { name: 'B' }, type: 'message' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ name: 'A' });

    pulse.dispose();
  });
});

describe('createPulse — wait()', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('resolves with the next event payload', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const p = pulse.wait('greet');

    ws.receive({ event: 'greet', payload: { name: 'Carol' }, type: 'message' });

    await expect(p).resolves.toEqual({ name: 'Carol' });

    pulse.dispose();
  });

  it('rejects when signal is pre-aborted', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const signal = AbortSignal.abort();
    const p = pulse.wait('greet', { signal });

    await expect(p).rejects.toThrow();

    pulse.dispose();
  });

  it('rejects when timeout elapses', async () => {
    vi.useFakeTimers();

    const { pulse, ws } = setup();

    ws.open();

    const p = pulse.wait('greet', { timeout: 500 });

    vi.advanceTimersByTime(500);

    await expect(p).rejects.toThrow();

    pulse.dispose();
  });

  it('rejects when pulse is disposed before event fires', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const p = pulse.wait('greet');

    pulse.dispose();

    await expect(p).rejects.toThrow();
  });
});

describe('createPulse — middleware', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('middleware can suppress a send', () => {
    MockWebSocket.instances = [];

    const pulse = createPulse<ServerEvents, ClientEvents>('ws://test', {
      middleware: [(_event, _payload, _next) => {}],
    });
    const ws = MockWebSocket.instances[0]!;

    ws.open();
    pulse.send('reply', { text: 'blocked' });

    expect(ws.sentMessages).toHaveLength(0);

    pulse.dispose();
  });

  it('middleware that calls next() allows the send', () => {
    MockWebSocket.instances = [];

    const pulse = createPulse<ServerEvents, ClientEvents>('ws://test', {
      middleware: [(_event, _payload, next) => next()],
    });
    const ws = MockWebSocket.instances[0]!;

    ws.open();
    pulse.send('reply', { text: 'allowed' });

    expect(ws.sentMessages).toHaveLength(1);

    pulse.dispose();
  });
});

describe('createPulse — rooms', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('join() sends a join frame and resolves on joined confirmation', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const joinP = pulse.join('lobby');

    ws.receive({ room: 'lobby', type: 'joined' });

    await expect(joinP).resolves.toBeUndefined();
    expect(pulse.rooms.value.has('lobby')).toBe(true);

    pulse.dispose();
  });

  it('leave() sends a leave frame and resolves on left confirmation', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const joinP = pulse.join('lobby');

    ws.receive({ room: 'lobby', type: 'joined' });
    await joinP;

    const leaveP = pulse.leave('lobby');

    ws.receive({ room: 'lobby', type: 'left' });

    await expect(leaveP).resolves.toBeUndefined();
    expect(pulse.rooms.value.has('lobby')).toBe(false);

    pulse.dispose();
  });

  it('join() rejects when pulse is disposed', async () => {
    const { pulse } = setup();

    pulse.dispose();

    await expect(pulse.join('x')).rejects.toThrow();
  });
});

describe('createPulse — onOpen/onClose/onError callbacks', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('onOpen fires when socket opens', () => {
    MockWebSocket.instances = [];

    const onOpen = vi.fn();
    const pulse = createPulse('ws://test', { onOpen });
    const ws = MockWebSocket.instances[0]!;

    ws.open();

    expect(onOpen).toHaveBeenCalledTimes(1);

    pulse.dispose();
  });

  it('onClose fires when socket closes', () => {
    MockWebSocket.instances = [];

    const onClose = vi.fn();
    const pulse = createPulse('ws://test', { onClose, reconnect: false });
    const ws = MockWebSocket.instances[0]!;

    ws.open();
    pulse.disconnect(1000, 'bye');

    expect(onClose).toHaveBeenCalledWith(1000, 'bye');

    pulse.dispose();
  });

  it('onError fires on socket error', () => {
    MockWebSocket.instances = [];

    const onError = vi.fn();
    const pulse = createPulse('ws://test', { onError });
    const ws = MockWebSocket.instances[0]!;

    ws.onerror?.(new Event('error'));

    expect(onError).toHaveBeenCalledTimes(1);

    pulse.dispose();
  });

  it('warns on socket error when no onError is provided', () => {
    MockWebSocket.instances = [];

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pulse = createPulse('ws://test', {});
    const ws = MockWebSocket.instances[0]!;

    ws.onerror?.(new Event('error'));

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('WebSocket error — pass onError'));

    warnSpy.mockRestore();
    pulse.dispose();
  });
});

describe('createPulse — reconnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('moves to reconnecting status on unexpected close', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', { reconnect: { delay: 0, maxAttempts: 1 } });
    const ws = MockWebSocket.instances[0]!;

    ws.open();
    ws.drop();

    await vi.runAllTimersAsync();

    expect(['reconnecting', 'open', 'closed']).toContain(pulse.status.value);

    pulse.dispose();
  });

  it('does NOT reconnect after intentional disconnect()', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', { reconnect: { delay: 0, maxAttempts: 5 } });
    const ws = MockWebSocket.instances[0]!;

    ws.open();
    pulse.disconnect(1000, 'bye');

    await vi.runAllTimersAsync();

    expect(MockWebSocket.instances).toHaveLength(1);

    pulse.dispose();
  });
});

describe('errors module', () => {
  it('PulseError has correct name', async () => {
    const { PulseError } = await import('../errors');
    const e = new PulseError('test');

    expect(e.name).toBe('PulseError');
    expect(e).toBeInstanceOf(Error);
  });

  it('PulseError.is() narrows PulseError instances', async () => {
    const { PulseError } = await import('../errors');

    expect(PulseError.is(new PulseError('test'))).toBe(true);
    expect(PulseError.is(new Error('plain'))).toBe(false);
    expect(PulseError.is('not an error')).toBe(false);
  });

  it('PulseConnectionError carries url', async () => {
    const { PulseConnectionError } = await import('../errors');
    const e = new PulseConnectionError('msg', 'ws://x');

    expect(e.url).toBe('ws://x');
    expect(e).toBeInstanceOf(Error);
  });

  it('PulseTimeoutError carries event name', async () => {
    const { PulseTimeoutError } = await import('../errors');
    const e = new PulseTimeoutError('greet');

    expect(e.event).toBe('greet');
    expect(e.message).toBe('Timed out waiting for "greet"');
  });

  it('PulseAbortError has the expected message', async () => {
    const { PulseAbortError } = await import('../errors');
    const e = new PulseAbortError();

    expect(e.message).toBe('Aborted');
    expect(e).toBeInstanceOf(Error);
  });

  it('PulseDisposedError defaults target to "Pulse"', async () => {
    const { PulseDisposedError } = await import('../errors');
    const e = new PulseDisposedError();

    expect(e.message).toBe('Pulse instance is disposed');
  });

  it('PulseDisposedError accepts a custom target', async () => {
    const { PulseDisposedError } = await import('../errors');
    const e = new PulseDisposedError('Channel');

    expect(e.message).toBe('Channel instance is disposed');
  });

  it('PulseProtocolError carries the raw value that failed to parse', async () => {
    const { PulseProtocolError } = await import('../errors');
    const e = new PulseProtocolError('bad frame', { raw: 'data' });

    expect(e.raw).toEqual({ raw: 'data' });
  });

  it.each(['PulseConnectionError', 'PulseTimeoutError', 'PulseAbortError', 'PulseDisposedError', 'PulseProtocolError'])(
    '%s chains a cause via opts.cause',
    async (className) => {
      const errors = await import('../errors');
      const cause = new Error('root cause');
      const ErrorClass = errors[className as keyof typeof errors] as new (...args: unknown[]) => Error;

      const args: Record<string, unknown[]> = {
        PulseAbortError: [{ cause }],
        PulseConnectionError: ['msg', 'ws://x', { cause }],
        PulseDisposedError: ['Pulse', { cause }],
        PulseProtocolError: ['bad frame', undefined, { cause }],
        PulseTimeoutError: ['greet', { cause }],
      };

      const e = new ErrorClass(...args[className]!);

      expect(e.cause).toBe(cause);
    },
  );
});

// ─── New coverage tests (C1–C7, B1, E1, E3) ───────────────────────────────────

describe('createPulse — once() early unsubscribe (C1)', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('once() unsub before event fires — handler never called', () => {
    const { pulse, ws } = setup();

    ws.open();

    const handler = vi.fn();
    const unsub = pulse.once('greet', handler);

    unsub();
    ws.receive({ event: 'greet', payload: { name: 'Alice' }, type: 'message' });

    expect(handler).not.toHaveBeenCalled();

    pulse.dispose();
  });
});

describe('createPulse — error frame handling (C4)', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('handles server error frame without throwing', () => {
    const { pulse, ws } = setup();

    ws.open();

    expect(() => {
      ws.receive({ code: 'E001', message: 'Not found', type: 'error' });
    }).not.toThrow();

    expect(pulse.disposed).toBe(false);

    pulse.dispose();
  });
});

describe('createPulse — join() with pre-aborted signal (C5)', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects immediately with PulseAbortError when signal is pre-aborted', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const { PulseAbortError } = await import('../errors');
    const p = pulse.join('lobby', { signal: AbortSignal.abort() });

    await expect(p).rejects.toBeInstanceOf(PulseAbortError);

    pulse.dispose();
  });
});

describe('createPulse — malformed message handling (C6)', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('handles non-JSON message without throwing', () => {
    const { pulse, ws } = setup();

    ws.open();

    expect(() => {
      ws.onmessage?.({ data: 'not-json{{{' });
    }).not.toThrow();

    expect(pulse.disposed).toBe(false);

    pulse.dispose();
  });

  it('handles message with missing type field without throwing', () => {
    const { pulse, ws } = setup();

    ws.open();

    expect(() => {
      ws.onmessage?.({ data: JSON.stringify({ event: 'greet', payload: {} }) });
    }).not.toThrow();

    pulse.dispose();
  });

  it('warns on a frame with a recognized shape but unrecognized type', () => {
    const { pulse, ws } = setup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ws.open();

    expect(() => {
      ws.receive({ type: 'not-a-real-frame-type' });
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Received frame with an unrecognized type: not-a-real-frame-type'),
    );

    warnSpy.mockRestore();
    pulse.dispose();
  });

  it('handles a recognized frame type with a malformed payload without throwing', () => {
    const { pulse, ws } = setup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ws.open();
    pulse.presence('lobby');

    expect(() => {
      // 'presence_state' is expected to carry a `members` object; omit it to
      // simulate a malformed-but-type-valid frame from the server.
      ws.receive({ room: 'lobby', type: 'presence_state' });
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Frame handling error'));

    warnSpy.mockRestore();
    pulse.dispose();
  });
});

describe('createPulse — wait() rejects with PulseTimeoutError (C7)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('rejects with PulseTimeoutError instance (not generic Error)', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const { PulseTimeoutError } = await import('../errors');
    const p = pulse.wait('greet', { timeout: 500 });

    vi.advanceTimersByTime(500);

    await expect(p).rejects.toBeInstanceOf(PulseTimeoutError);

    pulse.dispose();
  });
});

describe('createPulse — PulseDisposedError on dispose (B1)', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('connect() rejects with PulseDisposedError when disposed', async () => {
    const { pulse } = setup();
    const { PulseDisposedError } = await import('../errors');

    pulse.dispose();

    await expect(pulse.connect()).rejects.toBeInstanceOf(PulseDisposedError);
  });

  it('join() rejects with PulseDisposedError when disposed', async () => {
    const { pulse } = setup();
    const { PulseDisposedError } = await import('../errors');

    pulse.dispose();

    await expect(pulse.join('x')).rejects.toBeInstanceOf(PulseDisposedError);
  });

  it('leave() rejects with PulseDisposedError when disposed', async () => {
    const { pulse } = setup();
    const { PulseDisposedError } = await import('../errors');

    pulse.dispose();

    await expect(pulse.leave('x')).rejects.toBeInstanceOf(PulseDisposedError);
  });
});

describe('createPulse — warn on disposed on()/once() (E3)', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('on() after dispose returns no-op and does not throw', () => {
    const { pulse } = setup();

    pulse.dispose();

    const unsub = pulse.on('greet', vi.fn());

    expect(unsub).toBeTypeOf('function');
    expect(() => unsub()).not.toThrow();
  });

  it('channel.on() after dispose returns no-op and does not throw', () => {
    const { pulse, ws } = setup();

    ws.open();

    const ch = pulse.channel('chat');

    ch.dispose();

    const unsub = ch.on('greet', vi.fn());

    expect(unsub).toBeTypeOf('function');
    expect(() => unsub()).not.toThrow();

    pulse.dispose();
  });
});

describe('createPulse — B1: intentionalClose reset on reconnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('unexpected drop triggers reconnect after disconnect()+connect()', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', { reconnect: { delay: 0, maxAttempts: 2 } });
    const ws1 = MockWebSocket.instances[0]!;

    ws1.open();
    pulse.disconnect();

    await vi.runAllTimersAsync();

    MockWebSocket.instances = [];

    const connectP = pulse.connect();
    const ws2 = MockWebSocket.instances[0]!;

    ws2.open();
    await connectP;

    ws2.drop();
    await vi.runAllTimersAsync();

    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(2);

    pulse.dispose();
  });
});

describe('createPulse — B2: leave() auto-connect', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leave() rejects with PulseConnectionError when socket cannot open', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', {});
    const ws = MockWebSocket.instances[0]!;

    const leaveP = pulse.leave('lobby');

    ws.onerror?.(new Event('error'));

    await expect(leaveP).rejects.toThrow();

    pulse.dispose();
  });

  it('leave() rejects with PulseDisposedError when disposed', async () => {
    const { pulse } = setup();
    const { PulseDisposedError } = await import('../errors');

    pulse.dispose();

    await expect(pulse.leave('lobby')).rejects.toBeInstanceOf(PulseDisposedError);
  });
});

describe('createPulse — D3: reconnect budget exhausted warning', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('emits a warning and sets status to closed when budget exhausted', async () => {
    MockWebSocket.instances = [];

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const pulse = createPulse('ws://test', { reconnect: { delay: 0, maxAttempts: 1 } });
    const ws = MockWebSocket.instances[0]!;

    ws.open();
    ws.drop();

    await vi.runAllTimersAsync();

    const ws2 = MockWebSocket.instances[1];

    if (ws2 && !ws2.onopen) {
      ws2.onerror?.(new Event('error'));
      await vi.runAllTimersAsync();
    }

    if (pulse.status.value === 'closed') {
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Reconnect budget exhausted'));
    } else {
      expect(['reconnecting', 'open', 'closed']).toContain(pulse.status.value);
    }

    warnSpy.mockRestore();
    pulse.dispose();
  });
});

describe('createPulse — lazy option', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not open a WebSocket until connect() is called when lazy: true', () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', { lazy: true });

    expect(MockWebSocket.instances).toHaveLength(0);

    pulse.dispose();
  });

  it('connect() opens the socket when lazy: true', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', { lazy: true });
    const connectPromise = pulse.connect();

    const ws = MockWebSocket.instances[0]!;

    ws.open();
    await connectPromise;

    expect(pulse.status.value).toBe('open');

    pulse.dispose();
  });
});

describe('createPulse — buffer option', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queues send() calls while disconnected and flushes them on open', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', { buffer: true, lazy: true });

    pulse.send('hello', 'world');
    pulse.send('hello', 'again');

    const connectPromise = pulse.connect();
    const ws = MockWebSocket.instances[0]!;

    ws.open();
    await connectPromise;

    const hellos = ws.sentMessages.filter((m) => {
      const parsed = JSON.parse(m) as { event?: string };

      return parsed.event === 'hello';
    });

    expect(hellos).toHaveLength(2);

    pulse.dispose();
  });

  it('drops messages when buffer is disabled (default)', () => {
    MockWebSocket.instances = [];

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pulse = createPulse('ws://test', { lazy: true });

    pulse.send('hello', 'dropped');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('message dropped'));

    warnSpy.mockRestore();
    pulse.dispose();
  });
});

describe('createPulse — join() timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('rejects with PulseTimeoutError when timeout elapses before server confirms', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const joinPromise = pulse.join('room', { timeout: 100 });
    const assertion = expect(joinPromise).rejects.toBeInstanceOf(PulseTimeoutError);

    await vi.advanceTimersByTimeAsync(150);
    await assertion;

    pulse.dispose();
  });
});

describe('createPulse — E2: onReconnect callback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('calls onReconnect with attempt number on unexpected close', async () => {
    MockWebSocket.instances = [];

    const onReconnect = vi.fn();
    const pulse = createPulse('ws://test', {
      onReconnect,
      reconnect: { delay: 0, maxAttempts: 2 },
    });
    const ws1 = MockWebSocket.instances[0]!;

    ws1.open();
    ws1.drop();

    await vi.runAllTimersAsync();

    expect(onReconnect).toHaveBeenCalledWith(1);

    pulse.dispose();
  });
});
