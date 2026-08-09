import { PulseAbortError, PulseConnectionError } from '../errors';
import { MockWebSocket, frames, openPulse } from './_fixtures';

describe('createPulse session restoration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reference-counts channel subscriptions across independent scopes', async () => {
    const { pulse, socket } = await openPulse();
    const first = pulse.channel('chat');
    const second = pulse.channel('chat');

    expect(frames(socket).filter((frame) => frame.type === 'subscribe' && frame.channel === 'chat')).toHaveLength(1);

    first.dispose();
    expect(frames(socket).filter((frame) => frame.type === 'unsubscribe' && frame.channel === 'chat')).toHaveLength(0);

    second.dispose();
    expect(frames(socket).filter((frame) => frame.type === 'unsubscribe' && frame.channel === 'chat')).toHaveLength(1);

    pulse.dispose();
  });

  it('restores subscriptions, rooms, and local presence before becoming usable', async () => {
    const { pulse, socket } = await openPulse({ reconnect: { delay: 0, maxAttempts: 1 } });
    const chat = pulse.channel('chat');
    const lobby = pulse.presence('lobby');

    socket.receive({ room: 'lobby', type: 'joined' });
    lobby.update({ name: 'Ada' });
    socket.drop();

    expect(pulse.rooms.value).toEqual(new Set());
    expect(lobby.state.value).toEqual(new Map());

    await vi.advanceTimersByTimeAsync(0);

    const replacement = MockWebSocket.instances[1]!;

    replacement.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(frames(replacement)).toEqual([
      { channel: 'chat', type: 'subscribe' },
      { room: 'lobby', type: 'join' },
      { room: 'lobby', state: { name: 'Ada' }, type: 'presence' },
    ]);

    replacement.receive({ room: 'lobby', type: 'joined' });
    expect(pulse.rooms.value).toEqual(new Set(['lobby']));

    chat.dispose();
    lobby.dispose();
    pulse.dispose();
  });

  it('keeps separate presence scopes alive until the last scope is disposed', async () => {
    const { pulse, socket } = await openPulse();
    const first = pulse.presence('lobby');
    const second = pulse.presence('lobby');

    expect(frames(socket).filter((frame) => frame.type === 'join' && frame.room === 'lobby')).toHaveLength(1);

    first.dispose();
    expect(frames(socket).filter((frame) => frame.type === 'leave' && frame.room === 'lobby')).toHaveLength(0);

    second.dispose();
    expect(frames(socket).filter((frame) => frame.type === 'leave' && frame.room === 'lobby')).toHaveLength(1);

    pulse.dispose();
  });

  it('does not restore a presence update that failed while disconnected', async () => {
    const { pulse, socket } = await openPulse({ reconnect: { delay: 0, maxAttempts: 1 } });
    const lobby = pulse.presence('lobby');

    socket.drop();

    expect(() => lobby.update({ name: 'Ada' })).toThrow(PulseConnectionError);

    await vi.advanceTimersByTimeAsync(0);

    const replacement = MockWebSocket.instances[1]!;

    replacement.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(frames(replacement)).toEqual([{ room: 'lobby', type: 'join' }]);

    lobby.dispose();
    pulse.dispose();
  });

  it('serializes a leave requested before a pending join is confirmed', async () => {
    const { pulse, socket } = await openPulse();
    const joining = pulse.join('lobby');
    const leaving = pulse.leave('lobby');

    expect(frames(socket)).toEqual([{ room: 'lobby', type: 'join' }]);

    socket.receive({ room: 'lobby', type: 'joined' });
    await expect(joining).resolves.toBeUndefined();
    expect(frames(socket)).toEqual([
      { room: 'lobby', type: 'join' },
      { room: 'lobby', type: 'leave' },
    ]);

    socket.receive({ room: 'lobby', type: 'left' });
    await expect(leaving).resolves.toBeUndefined();
    expect(pulse.rooms.value).toEqual(new Set());

    pulse.dispose();
  });

  it('serializes a join requested before a pending leave is confirmed', async () => {
    const { pulse, socket } = await openPulse();
    const initialJoin = pulse.join('lobby');

    socket.receive({ room: 'lobby', type: 'joined' });
    await initialJoin;

    const leaving = pulse.leave('lobby');
    const joining = pulse.join('lobby');

    expect(frames(socket).slice(-1)).toEqual([{ room: 'lobby', type: 'leave' }]);

    socket.receive({ room: 'lobby', type: 'left' });
    await expect(leaving).resolves.toBeUndefined();
    expect(frames(socket).slice(-1)).toEqual([{ room: 'lobby', type: 'join' }]);

    socket.receive({ room: 'lobby', type: 'joined' });
    await expect(joining).resolves.toBeUndefined();
    expect(pulse.rooms.value).toEqual(new Set(['lobby']));

    pulse.dispose();
  });

  it('compensates for an aborted join after the server confirms it', async () => {
    const { pulse, socket } = await openPulse();
    const ctrl = new AbortController();
    const joining = pulse.join('lobby', { signal: ctrl.signal });

    ctrl.abort();
    await expect(joining).rejects.toBeInstanceOf(PulseAbortError);

    socket.receive({ room: 'lobby', type: 'joined' });

    expect(frames(socket)).toEqual([
      { room: 'lobby', type: 'join' },
      { room: 'lobby', type: 'leave' },
    ]);

    socket.receive({ room: 'lobby', type: 'left' });
    expect(pulse.rooms.value).toEqual(new Set());

    pulse.dispose();
  });
});
