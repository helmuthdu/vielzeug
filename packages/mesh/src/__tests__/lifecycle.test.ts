import { describe, expect, it, vi } from 'vitest';
import { MeshConnectionError, MeshDisposedError, MeshPairingError } from '../errors';
import { createMeshGuest } from '../guest';
import { createMeshHost } from '../host';
import { createFakeRtc } from '../testing';
import type { MeshEvent, MeshStatus } from '../types';
import { pairNodes, type TestProtocol } from './_pair';

function statuses(events: MeshEvent[]): MeshStatus[] {
  return events.flatMap((e) => (e.type === 'status-change' ? [e.status] : []));
}

describe('status transitions', () => {
  it('moves the host through pairing → connecting → connected', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const events: MeshEvent[] = [];
    host.tap((e) => events.push(e));

    const answer = await guest.acceptInvitation(await host.createInvitation());
    expect(statuses(events)).toEqual(['pairing']);

    await host.acceptAnswer(answer);
    expect(statuses(events)).toEqual(['pairing', 'connecting', 'connected']);
  });

  it('moves the guest through pairing → connecting → connected', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const events: MeshEvent[] = [];
    guest.tap((e) => events.push(e));

    const answer = await guest.acceptInvitation(await host.createInvitation());
    expect(statuses(events)).toEqual(['pairing', 'connecting']);

    await host.acceptAnswer(answer);
    await vi.waitFor(() => expect(guest.status).toBe('connected'));
    expect(statuses(events)).toEqual(['pairing', 'connecting', 'connected']);
  });
});

describe('peer lifecycle', () => {
  it('emits peer-joined with the live peer on both sides when the channel opens', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const hostEvents: MeshEvent[] = [];
    const guestEvents: MeshEvent[] = [];
    host.tap((e) => hostEvents.push(e));
    guest.tap((e) => guestEvents.push(e));

    const answer = await guest.acceptInvitation(await host.createInvitation());
    await host.acceptAnswer(answer);
    await vi.waitFor(() => expect(guest.status).toBe('connected'));

    const peerId = answer.peer.id;
    expect(hostEvents).toContainEqual({ peer: expect.objectContaining({ id: peerId }), type: 'peer-joined' });
    // The guest knows the host by the invitation's session id.
    expect(guestEvents).toContainEqual({
      peer: expect.objectContaining({ id: guest.host!.id, role: 'host' }),
      type: 'peer-joined',
    });
  });

  it('kick disconnects the guest and reports the reason', async () => {
    const { host, guest, peerId } = await pairNodes();
    const events: MeshEvent[] = [];
    host.tap((e) => events.push(e));

    host.kick(peerId, 'bye');
    await vi.waitFor(() => expect(guest.status).toBe('disconnected'));

    expect(host.peers.has(peerId)).toBe(false);
    expect(events).toContainEqual({
      peer: expect.objectContaining({ id: peerId }),
      reason: 'bye',
      type: 'peer-left',
    });
    expect(() => host.send(peerId, 'pong', { n: 1 })).toThrow(MeshConnectionError);
  });

  it('reports peer-left when the channel closes', async () => {
    const { host, guest, fx, peerId } = await pairNodes();
    const events: MeshEvent[] = [];
    host.tap((e) => events.push(e));

    fx.closeChannel(0);
    await vi.waitFor(() => expect(guest.status).toBe('disconnected'));

    expect(events.some((e) => e.type === 'peer-left' && e.peer.id === peerId)).toBe(true);
    expect(host.status).toBe('disconnected');
  });

  it('rejects a second guest presenting an already-connected peer id', async () => {
    const fx = createFakeRtc();
    const { host, guest, peerId } = await pairNodes({}, {}, fx);
    const guest2 = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const answer = await guest2.acceptInvitation(await host.createInvitation());

    await expect(host.acceptAnswer({ ...answer, peer: { id: peerId } })).rejects.toBeInstanceOf(MeshPairingError);
    // The first peer survives the rejected collision.
    expect(host.peers.get(peerId)?.status).toBe('connected');
    expect(guest.status).toBe('connected');
  });

  it('re-pairs on the same guest node after the host peer failed', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const received: number[] = [];
    guest.on('pong', (m) => received.push(m.payload.n));

    const first = await host.acceptAnswer(await guest.acceptInvitation(await host.createInvitation()));
    await vi.waitFor(() => expect(guest.status).toBe('connected'));
    host.kick(first.id, 'rotate');
    await vi.waitFor(() => expect(guest.status).toBe('disconnected'));

    const second = await host.acceptAnswer(await guest.acceptInvitation(await host.createInvitation()));
    await vi.waitFor(() => expect(guest.status).toBe('connected'));
    expect(second.id).not.toBe(first.id);

    host.send(second.id, 'pong', { n: 9 });
    await vi.waitFor(() => expect(received).toEqual([9]));
  });

  it('sends to an unknown peer throw MeshConnectionError', async () => {
    const { host } = await pairNodes();
    expect(() => host.send('nobody', 'pong', { n: 1 })).toThrow(MeshConnectionError);
  });

  it('keys every ice-state event by a real peer id', async () => {
    const fx = createFakeRtc();
    const { host, guest, peerId } = await pairNodes({}, {}, fx);
    const hostEvents: MeshEvent[] = [];
    const guestEvents: MeshEvent[] = [];
    host.tap((e) => hostEvents.push(e));
    guest.tap((e) => guestEvents.push(e));

    fx.closeChannel(0);
    await vi.waitFor(() => expect(guest.status).toBe('disconnected'));

    const hostIce = hostEvents.filter((e) => e.type === 'ice-state');
    const guestIce = guestEvents.filter((e) => e.type === 'ice-state');
    expect(hostIce.length).toBeGreaterThan(0);
    expect(guestIce.length).toBeGreaterThan(0);
    for (const event of hostIce) {
      if (event.type === 'ice-state') expect(event.peerId).toBe(peerId);
    }
    for (const event of guestIce) {
      if (event.type === 'ice-state') expect(event.peerId).toBe(guest.host!.id);
    }
  });
});

describe('dispose', () => {
  it('emits dispose, aborts disposalSignal, and detaches tappers', async () => {
    const { host } = await pairNodes();
    const events: MeshEvent[] = [];
    host.tap((e) => events.push(e));

    host.dispose();

    expect(events.at(-1)).toEqual({ type: 'dispose' });
    expect(host.disposalSignal.aborted).toBe(true);
    expect(host.disposed).toBe(true);
    expect(host.status).toBe('disposed');

    host.dispose();
    expect(events.filter((e) => e.type === 'dispose')).toHaveLength(1);
  });

  it('rejects method calls after dispose with MeshDisposedError', async () => {
    const { host, guest, peerId } = await pairNodes();
    host.dispose();
    guest.dispose();

    await expect(host.createInvitation()).rejects.toBeInstanceOf(MeshDisposedError);
    expect(() => host.send(peerId, 'pong', { n: 1 })).toThrow(MeshDisposedError);
    expect(() => host.broadcast('pong', { n: 1 })).toThrow(MeshDisposedError);
    expect(() => host.kick(peerId)).toThrow(MeshDisposedError);
    expect(() => guest.send('note', 'x')).toThrow(MeshDisposedError);
  });

  it('is idempotent', async () => {
    const { host } = await pairNodes();
    host.dispose();
    expect(() => host.dispose()).not.toThrow();
  });

  it('disposes when the signal option aborts', async () => {
    const fx = createFakeRtc();
    const controller = new AbortController();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc, signal: controller.signal });

    controller.abort();

    expect(host.disposed).toBe(true);
    expect(host.status).toBe('disposed');
  });

  it('supports the using declaration protocol', async () => {
    const fx = createFakeRtc();
    let host: ReturnType<typeof createMeshHost<TestProtocol>>;
    {
      using h = createMeshHost<TestProtocol>({ rtc: fx.rtc });
      host = h;
      expect(h.disposed).toBe(false);
    }
    expect(host.disposed).toBe(true);
  });
});
