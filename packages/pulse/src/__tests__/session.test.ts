import { PulseAbortError, PulseConnectionError, PulseDisposedError, PulseRoomTimeoutError } from '../errors';
import { frames, MockWebSocket, openPulse } from './_fixtures';

describe('createPulse room scopes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reference-counts room joins across independent scopes', async () => {
    const { pulse, socket } = await openPulse();
    const first = pulse.room('lobby');
    const second = pulse.room('lobby');

    expect(frames(socket).filter((frame) => frame.type === 'join' && frame.room === 'lobby')).toHaveLength(1);

    socket.receive({ room: 'lobby', type: 'joined' });

    first.dispose();
    expect(frames(socket).filter((frame) => frame.type === 'leave' && frame.room === 'lobby')).toHaveLength(0);

    second.dispose();
    expect(frames(socket).filter((frame) => frame.type === 'leave' && frame.room === 'lobby')).toHaveLength(1);

    pulse.dispose();
  });

  it('resolves joined when the server confirms membership', async () => {
    const { pulse, socket } = await openPulse();
    const lobby = pulse.room('lobby');

    socket.receive({ room: 'lobby', type: 'joined' });
    await expect(lobby.joined).resolves.toBeUndefined();
    expect(pulse.rooms.value).toEqual(new Set(['lobby']));

    lobby.dispose();
    pulse.dispose();
  });

  it('restores subscriptions, rooms, and local presence before becoming usable', async () => {
    const { pulse, socket } = await openPulse({ reconnect: { delay: 0, maxAttempts: 1 } });
    const chat = pulse.channel('chat');
    const lobby = pulse.room('lobby');

    socket.receive({ room: 'lobby', type: 'joined' });
    await lobby.joined;
    lobby.updatePresence({ name: 'Ada' });

    socket.drop();

    expect(pulse.rooms.value).toEqual(new Set());
    expect(lobby.presence.value).toEqual(new Map());

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

  it('does not restore a presence update that failed while disconnected', async () => {
    const { pulse, socket } = await openPulse({ reconnect: { delay: 0, maxAttempts: 1 } });
    const lobby = pulse.room('lobby');

    socket.receive({ room: 'lobby', type: 'joined' });
    await lobby.joined;

    socket.drop();

    expect(() => lobby.updatePresence({ name: 'Ada' })).toThrow(PulseConnectionError);

    await vi.advanceTimersByTimeAsync(0);

    const replacement = MockWebSocket.instances[1]!;

    replacement.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(frames(replacement)).toEqual([{ room: 'lobby', type: 'join' }]);

    lobby.dispose();
    pulse.dispose();
  });

  it('sends a compensating leave when a scope is disposed before join confirmation', async () => {
    const { pulse, socket } = await openPulse();
    const lobby = pulse.room('lobby');

    // Dispose before server confirms
    lobby.dispose();

    // Server confirms join — registry should send leave
    socket.receive({ room: 'lobby', type: 'joined' });

    expect(frames(socket).filter((f) => f.type === 'leave' && f.room === 'lobby')).toHaveLength(1);
    expect(pulse.rooms.value).toEqual(new Set());

    pulse.dispose();
  });

  it('rejects joined with PulseRoomTimeoutError when the server does not confirm in time', async () => {
    const { pulse } = await openPulse();
    const lobby = pulse.room('lobby', { timeout: 50 });

    const assertion = expect(lobby.joined).rejects.toBeInstanceOf(PulseRoomTimeoutError);

    await vi.advanceTimersByTimeAsync(50);
    await assertion;

    pulse.dispose();
  });

  it('does not fire timeout after successful join', async () => {
    const { pulse, socket } = await openPulse();
    const lobby = pulse.room('lobby', { timeout: 50 });

    socket.receive({ room: 'lobby', type: 'joined' });
    await lobby.joined;

    // Advance past the timeout — scope must not be auto-released
    await vi.advanceTimersByTimeAsync(100);

    expect(pulse.rooms.value).toEqual(new Set(['lobby']));
    expect(frames(socket).filter((f) => f.type === 'leave' && f.room === 'lobby')).toHaveLength(0);

    lobby.dispose();
    pulse.dispose();
  });

  it('rejects joined with PulseAbortError when the signal aborts', async () => {
    const { pulse, socket } = await openPulse();
    const ctrl = new AbortController();
    const lobby = pulse.room('lobby', { signal: ctrl.signal });

    ctrl.abort();
    await expect(lobby.joined).rejects.toBeInstanceOf(PulseAbortError);

    // Server confirms join — compensating leave sent
    socket.receive({ room: 'lobby', type: 'joined' });

    expect(frames(socket).filter((f) => f.type === 'leave' && f.room === 'lobby')).toHaveLength(1);

    pulse.dispose();
  });

  it('rejects joined with PulseConnectionError on transport close', async () => {
    const { pulse, socket } = await openPulse();
    const lobby = pulse.room('lobby');

    socket.drop();
    await expect(lobby.joined).rejects.toBeInstanceOf(PulseConnectionError);

    pulse.dispose();
  });

  it('tracks presence state reactively', async () => {
    const { pulse, socket } = await openPulse();
    const lobby = pulse.room('lobby');

    socket.receive({ room: 'lobby', type: 'joined' });
    await lobby.joined;

    socket.receive({ id: 'a', room: 'lobby', state: { name: 'Ada' }, type: 'presence_join' });
    expect(lobby.presence.value.get('a')).toEqual({ name: 'Ada' });

    socket.receive({ id: 'b', room: 'lobby', state: { name: 'Bea' }, type: 'presence_join' });
    expect(lobby.presence.value.size).toBe(2);

    socket.receive({ id: 'a', room: 'lobby', type: 'presence_leave' });
    expect(lobby.presence.value.has('a')).toBe(false);
    expect(lobby.presence.value.size).toBe(1);

    lobby.dispose();
    pulse.dispose();
  });

  it('fires onJoin and onLeave handlers', async () => {
    const { pulse, socket } = await openPulse();
    const lobby = pulse.room('lobby');
    const onJoin = vi.fn();
    const onLeave = vi.fn();

    lobby.onJoin(onJoin);
    lobby.onLeave(onLeave);

    socket.receive({ room: 'lobby', type: 'joined' });
    await lobby.joined;

    socket.receive({ id: 'a', room: 'lobby', state: { name: 'Ada' }, type: 'presence_join' });
    expect(onJoin).toHaveBeenCalledWith('a', { name: 'Ada' });

    socket.receive({ id: 'a', room: 'lobby', type: 'presence_leave' });
    expect(onLeave).toHaveBeenCalledWith('a');

    lobby.dispose();
    pulse.dispose();
  });

  it('supports plain rooms without presence', async () => {
    const { pulse, socket } = await openPulse();
    const announcements = pulse.room('announcements');

    socket.receive({ room: 'announcements', type: 'joined' });
    await expect(announcements.joined).resolves.toBeUndefined();
    expect(pulse.rooms.value).toEqual(new Set(['announcements']));

    announcements.dispose();
    expect(frames(socket).filter((f) => f.type === 'leave' && f.room === 'announcements')).toHaveLength(1);

    pulse.dispose();
  });

  it('throws PulseDisposedError when creating a room after disposal', async () => {
    const { pulse } = await openPulse();

    pulse.dispose();

    expect(() => pulse.room('lobby')).toThrow(PulseDisposedError);
  });
});
