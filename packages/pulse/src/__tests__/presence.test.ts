import { MockWebSocket, setup } from './_fixtures';

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

describe('createPulse — C1: presence disposed warnings', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('onJoin() warns when called on disposed presence channel', () => {
    const { pulse, ws } = setup();

    ws.open();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pres = pulse.presence('lobby');

    pres.dispose();
    pres.onJoin(vi.fn());

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('onJoin()'));

    warnSpy.mockRestore();
    pulse.dispose();
  });

  it('onLeave() warns when called on disposed presence channel', () => {
    const { pulse, ws } = setup();

    ws.open();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pres = pulse.presence('lobby');

    pres.dispose();
    pres.onLeave(vi.fn());

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('onLeave()'));

    warnSpy.mockRestore();
    pulse.dispose();
  });
});

describe('createPulse — presence dispose', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('presence.dispose() sends a leave frame to the server', () => {
    const { pulse, ws } = setup();

    ws.open();

    const pres = pulse.presence('lobby');

    pres.dispose();

    const leaveFrame = ws.sentMessages.find((m) => {
      const parsed = JSON.parse(m) as { room?: string; type: string };

      return parsed.type === 'leave' && parsed.room === 'lobby';
    });

    expect(leaveFrame).toBeDefined();

    pulse.dispose();
  });

  it('presence.disposalSignal aborts when presence is disposed', () => {
    const { pulse, ws } = setup();

    ws.open();

    const pres = pulse.presence('lobby');

    expect(pres.disposalSignal.aborted).toBe(false);
    pres.dispose();
    expect(pres.disposalSignal.aborted).toBe(true);

    pulse.dispose();
  });
});
