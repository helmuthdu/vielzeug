import { describe, expect, it, vi } from 'vitest';
import { MeshConnectionError, MeshDisposedError } from '../errors';
import { createMeshGuest } from '../guest';
import { createMeshHost } from '../host';
import type { MeshEvent, MeshPeerEvent, MeshStatus } from '../types';
import { createFakeRtc } from './_fixtures';
import { pairNodes, type TestProtocol } from './_pair';

function statuses(events: MeshEvent[]): MeshStatus[] {
  return events.flatMap((e) => (e.type === 'status-change' && e.peerId === null ? [e.status] : []));
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
  it('emits joined on both sides when the channel opens', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const hostEvents: MeshEvent[] = [];
    const guestEvents: MeshEvent[] = [];
    const peerEvents: MeshPeerEvent[] = [];
    host.tap((e) => hostEvents.push(e));
    guest.tap((e) => guestEvents.push(e));
    host.onPeer((e) => peerEvents.push(e));

    const answer = await guest.acceptInvitation(await host.createInvitation());
    await host.acceptAnswer(answer);
    await vi.waitFor(() => expect(guest.status).toBe('connected'));

    const peerId = answer.peer.id;
    expect(hostEvents).toContainEqual({ peerId, type: 'peer-joined' });
    expect(guestEvents.some((e) => e.type === 'peer-joined')).toBe(true);
    expect(peerEvents).toContainEqual({ peer: expect.objectContaining({ id: peerId }), type: 'joined' });
  });

  it('kick disconnects the guest and reports the reason', async () => {
    const { host, guest, peerId } = await pairNodes();
    const peerEvents: MeshPeerEvent[] = [];
    host.onPeer((e) => peerEvents.push(e));

    host.kick(peerId, 'bye');
    await vi.waitFor(() => expect(guest.status).toBe('disconnected'));

    expect(host.peers.has(peerId)).toBe(false);
    expect(peerEvents).toContainEqual({ peer: expect.objectContaining({ id: peerId }), reason: 'bye', type: 'left' });
    expect(() => host.send(peerId, 'pong', { n: 1 })).toThrow(MeshConnectionError);
  });

  it('reports peer-left when the channel closes', async () => {
    const { host, guest, fx, peerId } = await pairNodes();
    const events: MeshEvent[] = [];
    host.tap((e) => events.push(e));

    fx.closeChannel(0);
    await vi.waitFor(() => expect(guest.status).toBe('disconnected'));

    expect(events.some((e) => e.type === 'peer-left' && e.peerId === peerId)).toBe(true);
    expect(host.status).toBe('disconnected');
  });

  it('sends to an unknown peer throw MeshConnectionError', async () => {
    const { host } = await pairNodes();
    expect(() => host.send('nobody', 'pong', { n: 1 })).toThrow(MeshConnectionError);
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
