import { describe, expect, it } from 'vitest';
import { meshCodec } from '../codec';
import { MeshPairingError } from '../errors';
import { createMeshGuest } from '../guest';
import { createMeshHost } from '../host';
import type { MeshEvent, MeshInvitation } from '../types';
import { createFakeRtc } from './_fixtures';
import { pairNodes, type TestProtocol } from './_pair';

describe('createInvitation', () => {
  it('produces a versioned invitation with session, secret, expiry, and offer sdp', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const invitation = await host.createInvitation();

    expect(invitation.v).toBe(1);
    expect(invitation.sessionId.length).toBeGreaterThan(10);
    expect(invitation.secret.length).toBeGreaterThan(20);
    expect(invitation.expiresAt).toBeGreaterThan(Date.now());
    expect(invitation.sdp).toContain('fake-offer:');
  });

  it('emits invitation-created and moves the node to pairing', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const events: MeshEvent[] = [];
    host.tap((event) => events.push(event));

    const invitation = await host.createInvitation();

    expect(host.status).toBe('pairing');
    expect(events).toContainEqual({ sessionId: invitation.sessionId, type: 'invitation-created' });
  });
});

describe('pairing round-trip', () => {
  it('connects host and guest and exposes peers on both sides', async () => {
    const { host, guest, peerId } = await pairNodes();

    expect(host.status).toBe('connected');
    expect(guest.status).toBe('connected');
    expect(host.peers.get(peerId)?.status).toBe('connected');
    expect(guest.host?.status).toBe('connected');
  });

  it('rejects an answer for an unknown session', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    await host.createInvitation();

    await expect(
      host.acceptAnswer({ peer: { id: 'x' }, proof: 'p', sdp: 's', sessionId: 'nope', v: 1 }),
    ).rejects.toBeInstanceOf(MeshPairingError);
  });

  it('rejects a mismatched proof', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const invitation = await host.createInvitation();
    const answer = await guest.acceptInvitation(invitation);

    await expect(host.acceptAnswer({ ...answer, proof: 'forged' })).rejects.toBeInstanceOf(MeshPairingError);
  });

  it('rejects a duplicate answer', async () => {
    const { host } = await pairNodes();
    const fx = createFakeRtc();
    const host2 = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const guest2 = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const invitation = await host2.createInvitation();
    const answer = await guest2.acceptInvitation(invitation);

    await host2.acceptAnswer(answer);
    await expect(host2.acceptAnswer(answer)).rejects.toBeInstanceOf(MeshPairingError);
    host.dispose();
  });

  it('rejects pairing when approvePeer returns false and taps peer-rejected', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ approvePeer: () => false, rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const events: MeshEvent[] = [];
    host.tap((event) => events.push(event));

    const answer = await guest.acceptInvitation(await host.createInvitation());
    await expect(host.acceptAnswer(answer)).rejects.toBeInstanceOf(MeshPairingError);
    expect(events).toContainEqual({ peerId: answer.peer.id, type: 'peer-rejected' });
  });

  it('rejects an expired invitation on the guest side', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const invitation = await host.createInvitation();

    const guest = createMeshGuest<TestProtocol>({ clock: () => invitation.expiresAt + 1, rtc: fx.rtc });
    await expect(guest.acceptInvitation(invitation)).rejects.toBeInstanceOf(MeshPairingError);
  });

  it('rejects an answer to an expired invitation on the host side', async () => {
    const fx = createFakeRtc();
    let now = 1_000;
    const host = createMeshHost<TestProtocol>({ clock: () => now, invitationTtlMs: 100, rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ clock: () => now, rtc: fx.rtc });

    const invitation = await host.createInvitation();
    const answer = await guest.acceptInvitation(invitation);
    now = 2_000;

    await expect(host.acceptAnswer(answer)).rejects.toBeInstanceOf(MeshPairingError);
  });

  it('rejects a second acceptInvitation on the same guest', async () => {
    const { guest } = await pairNodes();
    const invitation: MeshInvitation = {
      expiresAt: Date.now() + 60_000,
      sdp: 'fake-offer:pcX',
      secret: 's',
      sessionId: 'other',
      v: 1,
    };
    await expect(guest.acceptInvitation(invitation)).rejects.toBeInstanceOf(MeshPairingError);
  });
});

describe('meshCodec', () => {
  it('round-trips an invitation', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const invitation = await host.createInvitation();

    expect(meshCodec.decode(meshCodec.encode(invitation))).toEqual(invitation);
  });

  it('round-trips an answer', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const answer = await guest.acceptInvitation(await host.createInvitation());

    expect(meshCodec.decode(meshCodec.encode(answer))).toEqual(answer);
  });

  it('rejects malformed text', () => {
    expect(() => meshCodec.decode('not-base64!!!')).toThrow(MeshPairingError);
  });

  it('rejects an unsupported version', () => {
    const text = meshCodec.encode({ peer: { id: 'x' }, proof: 'p', sdp: 's', sessionId: 'y', v: 2 } as never);
    expect(() => meshCodec.decode(text)).toThrow(MeshPairingError);
  });
});
