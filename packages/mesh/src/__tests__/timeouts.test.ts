import { describe, expect, it, vi } from 'vitest';
import { MeshTimeoutError } from '../errors';
import { createMeshGuest } from '../guest';
import { createMeshHost } from '../host';
import type { MeshEvent } from '../types';
import { createFakeRtc } from './_fixtures';
import { pairNodes, type TestProtocol } from './_pair';

describe('timeouts', () => {
  it('proceeds with partial candidates when ICE gathering stalls', async () => {
    const fx = createFakeRtc();
    fx.stallIce();
    const host = createMeshHost<TestProtocol>({ iceGatheringTimeoutMs: 20, rtc: fx.rtc });

    const invitation = await host.createInvitation();

    expect(invitation.sdp).toContain('fake-offer:');
    expect(host.status).toBe('pairing');
  });

  it('rejects acceptAnswer with MeshTimeoutError when the channel never opens', async () => {
    const fx = createFakeRtc();
    fx.hangOpen();
    const host = createMeshHost<TestProtocol>({ channelOpenTimeoutMs: 20, rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc });

    const answer = await guest.acceptInvitation(await host.createInvitation());
    await expect(host.acceptAnswer(answer)).rejects.toBeInstanceOf(MeshTimeoutError);
  });

  it('fails the guest with an error tap when the channel never opens', async () => {
    const fx = createFakeRtc();
    fx.hangOpen();
    const host = createMeshHost<TestProtocol>({ channelOpenTimeoutMs: 20, rtc: fx.rtc });
    const guest = createMeshGuest<TestProtocol>({ channelOpenTimeoutMs: 20, rtc: fx.rtc });
    const events: MeshEvent[] = [];
    guest.tap((e) => events.push(e));

    const answer = await guest.acceptInvitation(await host.createInvitation());
    await expect(host.acceptAnswer(answer)).rejects.toBeInstanceOf(MeshTimeoutError);

    await vi.waitFor(() => expect(guest.status).toBe('failed'));
    expect(events.some((e) => e.type === 'error' && e.error instanceof MeshTimeoutError)).toBe(true);
  });

  it('expires unanswered invitations at their TTL', async () => {
    vi.useFakeTimers();
    try {
      const fx = createFakeRtc();
      const host = createMeshHost<TestProtocol>({ invitationTtlMs: 1_000, rtc: fx.rtc });
      const events: MeshEvent[] = [];
      host.tap((e) => events.push(e));

      const invitation = await host.createInvitation();
      expect(host.status).toBe('pairing');

      await vi.advanceTimersByTimeAsync(1_001);

      expect(events).toContainEqual({ sessionId: invitation.sessionId, type: 'invitation-expired' });
      expect(host.status).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects answers arriving after the invitation expired', async () => {
    vi.useFakeTimers();
    try {
      const fx = createFakeRtc();
      const host = createMeshHost<TestProtocol>({ invitationTtlMs: 1_000, rtc: fx.rtc });
      const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc });

      const answer = await guest.acceptInvitation(await host.createInvitation());
      await vi.advanceTimersByTimeAsync(1_001);

      await expect(host.acceptAnswer(answer)).rejects.toThrow('expired');
    } finally {
      vi.useRealTimers();
    }
  });

  it('still pairs normally under fake timers with an injected clock', async () => {
    vi.useFakeTimers();
    try {
      const { host, guest } = await pairNodes({ clock: () => Date.now() });
      expect(host.status).toBe('connected');
      expect(guest.status).toBe('connected');
    } finally {
      vi.useRealTimers();
    }
  });
});
