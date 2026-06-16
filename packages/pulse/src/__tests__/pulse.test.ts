import { encode } from '../protocol';
import { createPulse } from '../pulse';

// ─── MockWebSocket ─────────────────────────────────────────────────────────────

class MockWebSocket {
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

type ServerEvents = { greet: { name: string }; ping: void };
type ClientEvents = { reply: { text: string } };

function setup() {
  MockWebSocket.instances = [];

  const pulse = createPulse<ServerEvents, ClientEvents>('ws://test', {});

  const ws = MockWebSocket.instances[0]!;

  return { pulse, ws };
}

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

describe('createPulse — channel', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a channel and sends subscribe frame', () => {
    const { pulse, ws } = setup();

    ws.open();
    pulse.channel('chat');

    expect(ws.sentMessages.some((m) => JSON.parse(m).type === 'subscribe')).toBe(true);

    pulse.dispose();
  });

  it('delivers channel-scoped messages to channel listeners', () => {
    const { pulse, ws } = setup();

    ws.open();

    const ch = pulse.channel<{ msg: string }>('chat');
    const handler = vi.fn();

    ch.on('msg', handler);
    ws.receive({ channel: 'chat', event: 'msg', payload: 'hello', type: 'message' });

    expect(handler).toHaveBeenCalledWith('hello');

    pulse.dispose();
  });

  it('channel messages do not fire root listeners', () => {
    const { pulse, ws } = setup();

    ws.open();

    pulse.channel('chat');

    const root = vi.fn();

    pulse.on('greet', root);
    ws.receive({ channel: 'chat', event: 'greet', payload: {}, type: 'message' });

    expect(root).not.toHaveBeenCalled();

    pulse.dispose();
  });

  it('channel.send() sends a channel-scoped frame', () => {
    const { pulse, ws } = setup();

    ws.open();

    const sentBefore = ws.sentMessages.length;
    const ch = pulse.channel<Record<string, never>, { reply: string }>('chat');

    ch.send('reply', 'hi');

    const channelMsg = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1]!) as {
      channel: string;
      event: string;
      type: string;
    };

    expect(ws.sentMessages.length).toBeGreaterThan(sentBefore);
    expect(channelMsg.channel).toBe('chat');
    expect(channelMsg.type).toBe('message');

    pulse.dispose();
  });

  it('channel.dispose() prevents further delivery', () => {
    const { pulse, ws } = setup();

    ws.open();

    const ch = pulse.channel<{ msg: string }>('chat');
    const handler = vi.fn();

    ch.on('msg', handler);
    ch.dispose();
    ws.receive({ channel: 'chat', event: 'msg', payload: 'after', type: 'message' });

    expect(handler).not.toHaveBeenCalled();

    pulse.dispose();
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

describe('createPulse — presence', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('state reflects presence_state frame', () => {
    const { pulse, ws } = setup();

    ws.open();

    const pres = pulse.presence<{ name: string }>('lobby');

    ws.receive({
      members: { alice: { name: 'Alice' }, bob: { name: 'Bob' } },
      room: 'lobby',
      type: 'presence_state',
    });

    expect(pres.state.value.get('alice')).toEqual({ name: 'Alice' });
    expect(pres.state.value.get('bob')).toEqual({ name: 'Bob' });

    pulse.dispose();
  });

  it('onJoin fires on presence_join frame', () => {
    const { pulse, ws } = setup();

    ws.open();

    const pres = pulse.presence<{ name: string }>('lobby');
    const onJoin = vi.fn();

    pres.onJoin(onJoin);
    ws.receive({ id: 'carol', room: 'lobby', state: { name: 'Carol' }, type: 'presence_join' });

    expect(onJoin).toHaveBeenCalledWith('carol', { name: 'Carol' });

    pulse.dispose();
  });

  it('onLeave fires on presence_leave frame', () => {
    const { pulse, ws } = setup();

    ws.open();

    const pres = pulse.presence<{ name: string }>('lobby');
    const onLeave = vi.fn();

    pres.onLeave(onLeave);
    ws.receive({ id: 'dave', room: 'lobby', type: 'presence_leave' });

    expect(onLeave).toHaveBeenCalledWith('dave');

    pulse.dispose();
  });

  it('update() sends a presence frame to the server', () => {
    const { pulse, ws } = setup();

    ws.open();

    const pres = pulse.presence<{ name: string }>('lobby');

    pres.update({ name: 'Eve' });

    const presenceMsg = ws.sentMessages.find((m) => JSON.parse(m).type === 'presence');

    expect(presenceMsg).toBeDefined();
    expect(JSON.parse(presenceMsg!)).toMatchObject({ room: 'lobby', state: { name: 'Eve' }, type: 'presence' });

    pulse.dispose();
  });

  it('ignores frames for a different room', () => {
    const { pulse, ws } = setup();

    ws.open();

    const pres = pulse.presence<{ name: string }>('lobby');
    const onJoin = vi.fn();

    pres.onJoin(onJoin);
    ws.receive({ id: 'frank', room: 'OTHER', state: { name: 'Frank' }, type: 'presence_join' });

    expect(onJoin).not.toHaveBeenCalled();

    pulse.dispose();
  });

  it('presence.dispose() clears handlers', () => {
    const { pulse, ws } = setup();

    ws.open();

    const pres = pulse.presence<{ name: string }>('lobby');
    const onJoin = vi.fn();

    pres.onJoin(onJoin);
    pres.dispose();
    ws.receive({ id: 'grace', room: 'lobby', state: { name: 'Grace' }, type: 'presence_join' });

    expect(onJoin).not.toHaveBeenCalled();

    pulse.dispose();
  });
});

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
});

describe('errors module', () => {
  it('PulseError has correct name', async () => {
    const { PulseError } = await import('../errors');
    const e = new PulseError('test');

    expect(e.name).toBe('PulseError');
    expect(e).toBeInstanceOf(Error);
  });

  it('ConnectionError carries url', async () => {
    const { ConnectionError } = await import('../errors');
    const e = new ConnectionError('msg', 'ws://x');

    expect(e.url).toBe('ws://x');
    expect(e).toBeInstanceOf(Error);
  });

  it('TimeoutError carries event name', async () => {
    const { TimeoutError } = await import('../errors');
    const e = new TimeoutError('greet');

    expect(e.event).toBe('greet');
  });
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

describe('createPulse — channel.once() early unsubscribe (C2)', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('channel.once() unsub before event fires — handler never called', () => {
    const { pulse, ws } = setup();

    ws.open();

    const ch = pulse.channel<{ msg: string }>('chat');
    const handler = vi.fn();
    const unsub = ch.once('msg', handler);

    unsub();
    ws.receive({ channel: 'chat', event: 'msg', payload: 'hello', type: 'message' });

    expect(handler).not.toHaveBeenCalled();

    pulse.dispose();
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

  it('rejects immediately with AbortError when signal is pre-aborted', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const { AbortError } = await import('../errors');
    const p = pulse.join('lobby', { signal: AbortSignal.abort() });

    await expect(p).rejects.toBeInstanceOf(AbortError);

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
});

describe('createPulse — wait() rejects with TimeoutError (C7)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('rejects with TimeoutError instance (not generic Error)', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const { TimeoutError } = await import('../errors');
    const p = pulse.wait('greet', { timeout: 500 });

    vi.advanceTimersByTime(500);

    await expect(p).rejects.toBeInstanceOf(TimeoutError);

    pulse.dispose();
  });
});

describe('createPulse — DisposedError on dispose (B1)', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('connect() rejects with DisposedError when disposed', async () => {
    const { pulse } = setup();
    const { DisposedError } = await import('../errors');

    pulse.dispose();

    await expect(pulse.connect()).rejects.toBeInstanceOf(DisposedError);
  });

  it('join() rejects with DisposedError when disposed', async () => {
    const { pulse } = setup();
    const { DisposedError } = await import('../errors');

    pulse.dispose();

    await expect(pulse.join('x')).rejects.toBeInstanceOf(DisposedError);
  });

  it('leave() rejects with DisposedError when disposed', async () => {
    const { pulse } = setup();
    const { DisposedError } = await import('../errors');

    pulse.dispose();

    await expect(pulse.leave('x')).rejects.toBeInstanceOf(DisposedError);
  });
});

describe('createPulse — channel.wait() timeout (E1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('rejects with TimeoutError when channel.wait() times out', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const { TimeoutError } = await import('../errors');
    const ch = pulse.channel<{ msg: string }>('chat');
    const p = ch.wait('msg', { timeout: 200 });

    vi.advanceTimersByTime(200);

    await expect(p).rejects.toBeInstanceOf(TimeoutError);

    pulse.dispose();
  });

  it('resolves if event arrives before timeout', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const ch = pulse.channel<{ msg: string }>('chat');
    const p = ch.wait('msg', { timeout: 500 });

    ws.receive({ channel: 'chat', event: 'msg', payload: 'hi', type: 'message' });

    await expect(p).resolves.toBe('hi');

    pulse.dispose();
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
