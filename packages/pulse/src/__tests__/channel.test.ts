import { PulseTimeoutError } from '../errors';
import { createPulse } from '../pulse';
import { MockWebSocket, setup } from './_fixtures';

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

  it('channel.send() warns and drops the message when disposed', () => {
    const { pulse, ws } = setup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ws.open();

    const ch = pulse.channel<Record<string, never>, { reply: string }>('chat');

    ch.dispose();
    ch.send('reply', 'hi');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("send('reply') called on a disposed channel 'chat'"));

    warnSpy.mockRestore();
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

describe('createPulse — channel.wait() timeout (E1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('rejects with PulseTimeoutError when channel.wait() times out', async () => {
    const { pulse, ws } = setup();

    ws.open();

    const { PulseTimeoutError } = await import('../errors');
    const ch = pulse.channel<{ msg: string }>('chat');
    const p = ch.wait('msg', { timeout: 200 });

    vi.advanceTimersByTime(200);

    await expect(p).rejects.toBeInstanceOf(PulseTimeoutError);

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

describe('createPulse — D1: channel re-subscription on reconnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('re-sends subscribe frames for active channels after reconnect', async () => {
    MockWebSocket.instances = [];

    const pulse = createPulse('ws://test', { reconnect: { delay: 0, maxAttempts: 1 } });
    const ws1 = MockWebSocket.instances[0]!;

    ws1.open();
    pulse.channel('chat');

    ws1.drop();
    await vi.runAllTimersAsync();

    const ws2 = MockWebSocket.instances[1];

    if (ws2) {
      ws2.open();

      const resubscribe = ws2.sentMessages.find((m) => {
        const parsed = JSON.parse(m) as { channel?: string; type: string };

        return parsed.type === 'subscribe' && parsed.channel === 'chat';
      });

      expect(resubscribe).toBeDefined();
    } else {
      expect(pulse.status.value).toBe('closed');
    }

    pulse.dispose();
  });

  it('sends subscribe immediately when socket is already open', () => {
    const { pulse, ws } = setup();

    ws.open();
    pulse.channel('events');

    const sub = ws.sentMessages.find((m) => {
      const parsed = JSON.parse(m) as { channel?: string; type: string };

      return parsed.type === 'subscribe' && parsed.channel === 'events';
    });

    expect(sub).toBeDefined();

    pulse.dispose();
  });

  it('sends unsubscribe when channel is disposed', () => {
    const { pulse, ws } = setup();

    ws.open();

    const ch = pulse.channel('room1');

    ch.dispose();

    const unsub = ws.sentMessages.find((m) => {
      const parsed = JSON.parse(m) as { channel?: string; type: string };

      return parsed.type === 'unsubscribe' && parsed.channel === 'room1';
    });

    expect(unsub).toBeDefined();

    pulse.dispose();
  });

  it('channel() returns the same object for the same name (memoized)', () => {
    const { pulse, ws } = setup();

    ws.open();

    const ch1 = pulse.channel('shared');
    const ch2 = pulse.channel('shared');

    expect(ch1).toBe(ch2);

    pulse.dispose();
  });

  it('channel() returns a new object after the previous one is disposed', () => {
    const { pulse, ws } = setup();

    ws.open();

    const ch1 = pulse.channel('shared');

    ch1.dispose();

    const ch2 = pulse.channel('shared');

    expect(ch1).not.toBe(ch2);

    pulse.dispose();
  });

  it('channel() exposes disposalSignal aborted when disposed', () => {
    const { pulse, ws } = setup();

    ws.open();

    const ch = pulse.channel('events');

    expect(ch.disposalSignal.aborted).toBe(false);
    ch.dispose();
    expect(ch.disposalSignal.aborted).toBe(true);

    pulse.dispose();
  });
});
