import { describe, expect, it, vi } from 'vitest';
import { MeshPayloadError } from '../errors';
import { createMeshGuest } from '../guest';
import type { MeshEvent, MeshInbound } from '../types';
import { createFakeRtc } from './_fixtures';
import { pairNodes, type TestProtocol } from './_pair';

describe('messaging', () => {
  it('delivers a typed message from host to guest with metadata', async () => {
    const { host, guest, peerId } = await pairNodes();
    const received: MeshInbound<{ n: number }>[] = [];
    guest.on('pong', (message) => received.push(message));

    host.send(peerId, 'pong', { n: 1 });
    await vi.waitFor(() => expect(received).toHaveLength(1));

    expect(received[0]!.payload).toEqual({ n: 1 });
    // The invitation carries no host identity — the session id is the
    // host's peer id as the guest knows it.
    expect(received[0]!.peerId).toBe(guest.host!.id);
    expect(received[0]!.messageId).toBeTruthy();
    expect(received[0]!.sentAt).toBeGreaterThan(0);
  });

  it('delivers a typed message from guest to host', async () => {
    const { host, guest, peerId } = await pairNodes();
    const received: MeshInbound<string>[] = [];
    host.on('note', (message) => received.push(message));

    guest.send('note', 'hello');
    await vi.waitFor(() => expect(received).toHaveLength(1));

    expect(received[0]!.payload).toBe('hello');
    expect(received[0]!.peerId).toBe(peerId);
  });

  it('broadcasts to every connected guest', async () => {
    const fx = createFakeRtc();
    const { host, guest } = await pairNodes({}, {}, fx);
    const guest2 = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    await host.acceptAnswer(await guest2.acceptInvitation(await host.createInvitation()));

    const seen1: number[] = [];
    const seen2: number[] = [];
    guest.on('pong', (m) => seen1.push(m.payload.n));
    guest2.on('pong', (m) => seen2.push(m.payload.n));

    host.broadcast('pong', { n: 7 });
    await vi.waitFor(() => {
      expect(seen1).toEqual([7]);
      expect(seen2).toEqual([7]);
    });
  });

  it('broadcast skips peers listed in except', async () => {
    const fx = createFakeRtc();
    const { host, guest, peerId } = await pairNodes({}, {}, fx);
    const guest2 = createMeshGuest<TestProtocol>({ rtc: fx.rtc });
    const answer = await guest2.acceptInvitation(await host.createInvitation());
    await host.acceptAnswer(answer);

    const seen1: unknown[] = [];
    const seen2: unknown[] = [];
    guest.on('pong', (m) => seen1.push(m.payload));
    guest2.on('pong', (m) => seen2.push(m.payload));

    host.broadcast('pong', { n: 1 }, { except: [peerId] });
    await vi.waitFor(() => expect(seen2).toHaveLength(1));
    expect(seen1).toHaveLength(0);
  });

  it('throws MeshPayloadError for outbound messages over the byte cap', async () => {
    const { host, peerId } = await pairNodes({ maxMessageBytes: 120 });
    const big = { n: 1, pad: 'x'.repeat(500) };
    expect(() => host.send(peerId, 'pong', big as { n: number })).toThrow(MeshPayloadError);
    expect(() => host.send(peerId, 'pong', { n: 1 })).not.toThrow();
  });

  it('drops inbound messages over the byte cap and taps message-rejected', async () => {
    const { host, guest } = await pairNodes({ maxMessageBytes: 120 });
    const events: MeshEvent[] = [];
    host.tap((event) => events.push(event));
    const received: unknown[] = [];
    host.on('note', (m) => received.push(m.payload));

    guest.send('note', 'x'.repeat(500));
    await vi.waitFor(() =>
      expect(events).toContainEqual({ peerId: expect.any(String), reason: 'too-large', type: 'message-rejected' }),
    );
    expect(received).toHaveLength(0);
  });

  it('drops duplicate message ids and taps message-rejected', async () => {
    const { host, guest, peerId } = await pairNodes({ random: { next: () => 0.5 } });
    const events: MeshEvent[] = [];
    guest.tap((event) => events.push(event));
    const received: unknown[] = [];
    guest.on('pong', (m) => received.push(m.payload));

    host.send(peerId, 'pong', { n: 1 });
    host.send(peerId, 'pong', { n: 2 });
    await vi.waitFor(() =>
      expect(events).toContainEqual({ peerId: expect.any(String), reason: 'duplicate', type: 'message-rejected' }),
    );
    expect(received).toHaveLength(1);
  });

  it('taps unknown-type instead of throwing for unregistered message types', async () => {
    const { host, guest } = await pairNodes();
    const events: MeshEvent[] = [];
    host.tap((event) => events.push(event));

    (guest.send as (type: string, payload: unknown) => void)('mystery', 1);
    await vi.waitFor(() =>
      expect(events).toContainEqual({ peerId: expect.any(String), reason: 'unknown-type', type: 'message-rejected' }),
    );
  });

  it('supports a custom serializer', async () => {
    const serialize = (value: unknown) => `X${JSON.stringify(value)}`;
    const deserialize = (text: string) => JSON.parse(text.slice(1)) as unknown;
    const { host, guest, peerId } = await pairNodes({ deserialize, serialize }, { deserialize, serialize });

    const received: unknown[] = [];
    guest.on('pong', (m) => received.push(m.payload));
    host.send(peerId, 'pong', { n: 3 });
    await vi.waitFor(() => expect(received).toEqual([{ n: 3 }]));
  });

  it('taps message-sent and message-received with byte counts', async () => {
    const { host, guest, peerId } = await pairNodes();
    const hostEvents: MeshEvent[] = [];
    const guestEvents: MeshEvent[] = [];
    host.tap((e) => hostEvents.push(e));
    guest.tap((e) => guestEvents.push(e));
    guest.on('pong', () => {});

    host.send(peerId, 'pong', { n: 1 });
    await vi.waitFor(() => expect(guestEvents.some((e) => e.type === 'message-received')).toBe(true));
    expect(hostEvents.some((e) => e.type === 'message-sent' && e.bytes > 0)).toBe(true);
  });
});
