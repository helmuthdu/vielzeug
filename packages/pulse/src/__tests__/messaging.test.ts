import { PulseConnectionError, PulseProtocolError, PulseTimeoutError } from '../errors';
import { MockWebSocket, frames, openPulse } from './_fixtures';

describe('createPulse messaging', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('routes root and channel messages to their own listeners', async () => {
    const { pulse, socket } = await openPulse();
    const root = vi.fn();
    const channel = vi.fn();

    pulse.on('greet', root);
    pulse.channel('chat').on('message', channel);
    socket.receive({ event: 'greet', payload: { name: 'Ada' }, type: 'message' });
    socket.receive({ channel: 'chat', event: 'message', payload: { text: 'Hi' }, type: 'message' });

    expect(root).toHaveBeenCalledWith({ name: 'Ada' });
    expect(channel).toHaveBeenCalledWith({ text: 'Hi' });

    pulse.dispose();
  });

  it('removes a once listener after its first message', async () => {
    const { pulse, socket } = await openPulse();
    const handler = vi.fn();

    pulse.once('notice', handler);
    socket.receive({ event: 'notice', payload: 'one', type: 'message' });
    socket.receive({ event: 'notice', payload: 'two', type: 'message' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('one');

    pulse.dispose();
  });

  it('rejects wait() with PulseTimeoutError', async () => {
    const { pulse } = await openPulse();
    const waiting = pulse.wait('notice', { timeout: 10 });
    const assertion = expect(waiting).rejects.toBeInstanceOf(PulseTimeoutError);

    await vi.advanceTimersByTimeAsync(10);

    await assertion;
    pulse.dispose();
  });

  it('applies one transform to root and channel application messages', async () => {
    const { pulse, socket } = await openPulse({
      transform: (message) => (message.event === 'drop' ? null : { ...message, event: `wire:${message.event}` }),
    });

    pulse.send('reply', { text: 'root' });
    pulse.channel('chat').send('send', { text: 'channel' });
    pulse.send('drop' as 'reply', { text: 'ignored' });

    expect(frames(socket).filter((frame) => frame.type === 'message')).toEqual([
      { event: 'wire:reply', payload: { text: 'root' }, type: 'message' },
      { channel: 'chat', event: 'wire:send', payload: { text: 'channel' }, type: 'message' },
    ]);

    pulse.dispose();
  });

  it('reports malformed and server error frames through onError', async () => {
    const onError = vi.fn();
    const { pulse, socket } = await openPulse({ onError });

    socket.onmessage?.({ data: 'not-json' } as MessageEvent);
    socket.receive({ code: 'forbidden', message: 'No access', type: 'error' });

    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(expect.any(PulseProtocolError));

    pulse.dispose();
  });

  it('rejects room operations when disconnected', async () => {
    const { pulse } = await openPulse();

    pulse.disconnect();

    await expect(pulse.join('lobby')).rejects.toBeInstanceOf(PulseConnectionError);
    pulse.dispose();
  });
});
