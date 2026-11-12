import { MeshPairingError } from '@vielzeug/mesh';
import { createFakeRtc } from '@vielzeug/mesh/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  hostTavern,
  joinTavern,
  TavernDisposedError,
  TavernError,
  type TavernGuestEvent,
  type TavernHostEvent,
  TavernPairingError,
} from '../index';

interface BookHarness {
  applied: { args: readonly unknown[]; name: string }[];
  guest: Awaited<ReturnType<typeof joinTavern<{ id: string; title: string }>>>['guest'];
  host: ReturnType<typeof hostTavern>;
  mounted: string[];
  peerId: string;
  ready: Promise<{ id: string; title: string }>;
}

/** Hosts a book whose title changes through the `rename` command, plus a guest that mirrors it. */
async function tavernBook(
  options: {
    onEnded?(subject: { id: string; title: string }): void;
    onNotice?(wire: unknown): void;
    serializeNotice?(notice: unknown): unknown | null;
  } = {},
): Promise<BookHarness> {
  const { rtc } = createFakeRtc();
  const applied: { args: readonly unknown[]; name: string }[] = [];
  const mounted: string[] = [];
  let broadcast: (() => void) | undefined;
  let book = { title: 'Draft' };

  const host = hostTavern({
    commands: {
      rename: (args) => {
        applied.push({ args: [...args], name: 'rename' });
        book = { ...book, title: args[0] as string };
        broadcast?.();
      },
    },
    rtc,
    serializeNotice: options.serializeNotice,
    subject: {
      onChanged: (listener) => {
        broadcast = listener;
        return () => undefined;
      },
      onRemoved: () => () => undefined,
      snapshot: () => ({ ...book }),
    },
  });

  const joined = await joinTavern<{ id: string; title: string }>({
    invitationCode: await host.createInvitationCode(),
    mount: (snapshot) => {
      const parsed = snapshot as { title: string };
      mounted.push(parsed.title);
      return { id: 'book-1', ...parsed };
    },
    name: 'Sam',
    onEnded: options.onEnded,
    onNotice: options.onNotice,
    rtc,
  });
  const peer = await host.acceptAnswerCode(joined.answerCode);

  return { applied, guest: joined.guest, host, mounted, peerId: peer.id, ready: joined.ready };
}

describe('tavern', () => {
  it('pairs a guest, mirrors the subject, and applies forwarded commands on the host', async () => {
    const { applied, guest, host, mounted, ready } = await tavernBook();

    // The first snapshot arrives on join and settles `ready`.
    await expect(ready).resolves.toEqual({ id: 'book-1', title: 'Draft' });
    expect(mounted).toEqual(['Draft']);

    guest.sendCommand('rename', ['Final']);
    await vi.waitFor(() => expect(applied).toEqual([{ args: ['Final'], name: 'rename' }]));

    // The host's own change re-broadcasts the updated snapshot (after the microtask coalesce).
    await vi.waitFor(() => expect(mounted).toEqual(['Draft', 'Final']));

    guest.dispose();
    host.dispose();
  });

  it('coalesces bursts of local changes into one snapshot broadcast', async () => {
    const { rtc } = createFakeRtc();
    let changes = 0;
    const broadcasts: unknown[][] = [];

    const host = hostTavern({
      rtc,
      subject: {
        onChanged: (listener) => {
          const fire = listener;
          // Simulate a burst: three changes in one synchronous block.
          changes = 3;
          fire();
          fire();
          fire();
          return () => undefined;
        },
        onRemoved: () => () => undefined,
        snapshot: () => {
          broadcasts.push([changes]);
          return { changes };
        },
      },
    });

    const joined = await joinTavern<{ id: string }>({
      invitationCode: await host.createInvitationCode(),
      mount: (snapshot) => ({ id: 'book-1', ...(snapshot as object) }),
      name: 'Sam',
      rtc,
    });
    await host.acceptAnswerCode(joined.answerCode);

    // Wait for the microtask to flush.
    await new Promise((resolve) => setTimeout(resolve, 10));

    // The burst of three changes produced one read, plus the join snapshot: exactly two.
    expect(broadcasts).toHaveLength(2);

    joined.guest.dispose();
    host.dispose();
  });

  it('rejects a command the table does not hold, answering with its id', async () => {
    const { guest, host, ready } = await tavernBook();
    const rejected: TavernGuestEvent[] = [];
    guest.tap((event) => rejected.push(event));
    await ready;

    guest.sendCommand('erase');
    await vi.waitFor(() => expect(rejected).toHaveLength(1));
    expect(rejected[0]).toMatchObject({ message: expect.stringContaining('erase'), type: 'rejected' });
    // The rejection carries the id of the command it answers.
    expect(rejected[0]!.type === 'rejected' && rejected[0]!.commandId).toMatch(/^cmd-/);

    guest.dispose();
    host.dispose();
  });

  it('rejects with the handler message when a command throws on the host', async () => {
    const { rtc } = createFakeRtc();
    const host = hostTavern({
      commands: {
        rename: () => {
          throw new Error('The title is too short.');
        },
      },
      rtc,
      subject: {
        onChanged: () => () => undefined,
        onRemoved: () => () => undefined,
        snapshot: () => ({ title: 'Draft' }),
      },
    });
    const joined = await joinTavern<{ id: string }>({
      invitationCode: await host.createInvitationCode(),
      mount: (snapshot) => ({ id: 'book-1', ...(snapshot as object) }),
      name: 'Sam',
      rtc,
    });
    const rejected: TavernGuestEvent[] = [];
    joined.guest.tap((event) => rejected.push(event));
    await host.acceptAnswerCode(joined.answerCode);

    joined.guest.sendCommand('rename', ['x']);
    await vi.waitFor(() => expect(rejected).toHaveLength(1));
    expect(rejected[0]).toMatchObject({ message: 'The title is too short.', type: 'rejected' });

    joined.guest.dispose();
    host.dispose();
  });

  it('rejects prototype member names as commands', async () => {
    const { guest, host, ready } = await tavernBook();
    const rejected: TavernGuestEvent[] = [];
    guest.tap((event) => rejected.push(event));
    await ready;

    // "constructor" resolves through Object.prototype: only own table entries count.
    guest.sendCommand('constructor');
    await vi.waitFor(() => expect(rejected).toHaveLength(1));
    expect(rejected[0]).toMatchObject({ message: expect.stringContaining('constructor'), type: 'rejected' });

    guest.dispose();
    host.dispose();
  });

  it('rejects every command in a read-only session', async () => {
    const { rtc } = createFakeRtc();
    const host = hostTavern({
      rtc,
      subject: {
        onChanged: () => () => undefined,
        onRemoved: () => () => undefined,
        snapshot: () => ({ title: 'Draft' }),
      },
    });
    const joined = await joinTavern<{ id: string }>({
      invitationCode: await host.createInvitationCode(),
      mount: (snapshot) => ({ id: 'book-1', ...(snapshot as object) }),
      name: 'Sam',
      rtc,
    });
    const rejected: TavernGuestEvent[] = [];
    joined.guest.tap((event) => rejected.push(event));
    await host.acceptAnswerCode(joined.answerCode);

    joined.guest.sendCommand('rename', ['Final']);
    await vi.waitFor(() => expect(rejected).toHaveLength(1));
    expect(rejected[0]).toMatchObject({ message: expect.stringContaining('rename'), type: 'rejected' });

    joined.guest.dispose();
    host.dispose();
  });

  it('relays host notices to the guests through the serializer', async () => {
    const relayed: string[] = [];
    const { guest, host } = await tavernBook({
      onNotice: (wire) => relayed.push(String(wire)),
      serializeNotice: (notice) => (typeof notice === 'string' ? notice : null),
    });

    host.relayNotice('Chapter 3 begins');
    host.relayNotice({ ignored: true });
    await vi.waitFor(() => expect(relayed).toEqual(['Chapter 3 begins']));

    guest.dispose();
    host.dispose();
  });

  it('reports the mounted subject when the guest leaves', async () => {
    const ended: string[] = [];
    const { guest, host, ready } = await tavernBook({ onEnded: (subject) => ended.push(subject.id) });
    await ready;

    guest.dispose();
    expect(ended).toEqual(['book-1']);

    // Dispose again after the session already ended: onEnded fires exactly once.
    guest.dispose();
    expect(ended).toEqual(['book-1']);

    host.dispose();
  });

  it('throws a typed pairing error when given the wrong code kind', async () => {
    const { host } = await tavernBook();

    // Passing an invitation where an answer is expected: the wrong code kind.
    const invitation = await host.createInvitationCode();
    await expect(host.acceptAnswerCode(invitation)).rejects.toThrow(TavernPairingError);

    host.dispose();
  });

  it('wraps a malformed answer code as TavernPairingError with the cause chained', async () => {
    const { host } = await tavernBook();

    const rejection = await host.acceptAnswerCode('not-a-pairing-code').catch((error: unknown) => error);
    expect(rejection).toBeInstanceOf(TavernPairingError);
    expect((rejection as TavernPairingError).name).toBe('TavernPairingError');
    expect((rejection as TavernPairingError).cause).toBeInstanceOf(MeshPairingError);

    host.dispose();
  });

  it('wraps a malformed invitation code as TavernPairingError', async () => {
    const { rtc } = createFakeRtc();
    await expect(
      joinTavern({ invitationCode: 'not-a-pairing-code', mount: () => null, name: 'Sam', rtc }),
    ).rejects.toBeInstanceOf(TavernPairingError);
  });

  it('fires host onEnded exactly once when the subject is removed', async () => {
    const { rtc } = createFakeRtc();
    let removed: (() => void) | undefined;
    let ended = 0;
    const host = hostTavern({
      onEnded: () => {
        ended += 1;
      },
      rtc,
      subject: {
        onChanged: () => () => undefined,
        onRemoved: (listener) => {
          removed = listener;
          return () => undefined;
        },
        snapshot: () => ({ title: 'Draft' }),
      },
    });

    removed?.();
    expect(ended).toBe(1);
    expect(host.disposed).toBe(true);

    // Dispose again after hosting already ended: onEnded fires exactly once.
    host.dispose();
    expect(ended).toBe(1);
  });

  it('fires host onEnded on explicit dispose', async () => {
    const { rtc } = createFakeRtc();
    let ended = 0;
    const host = hostTavern({
      onEnded: () => {
        ended += 1;
      },
      rtc,
      subject: {
        onChanged: () => () => undefined,
        onRemoved: () => () => undefined,
        snapshot: () => ({ title: 'Draft' }),
      },
    });

    host.dispose();
    expect(ended).toBe(1);
  });

  it('ends the guest session when the host kicks it', async () => {
    const ended: string[] = [];
    const { guest, host, peerId, ready } = await tavernBook({ onEnded: (subject) => ended.push(subject.id) });
    await ready;

    host.kick(peerId);
    await vi.waitFor(() => expect(guest.disposed).toBe(true));
    expect(ended).toEqual(['book-1']);
  });

  it('exposes the disposal surface on both handles', async () => {
    const { guest, host } = await tavernBook();
    expect(host.disposed).toBe(false);
    expect(guest.disposed).toBe(false);
    expect(host.disposalSignal.aborted).toBe(false);
    expect(guest.disposalSignal.aborted).toBe(false);

    host[Symbol.dispose]();
    guest[Symbol.dispose]();
    expect(host.disposed).toBe(true);
    expect(guest.disposed).toBe(true);
    expect(host.disposalSignal.aborted).toBe(true);
    expect(guest.disposalSignal.aborted).toBe(true);
  });

  it('throws TavernDisposedError when sending a command after the session ended', async () => {
    const { guest } = await tavernBook();
    guest.dispose();
    expect(() => guest.sendCommand('rename', [])).toThrow(TavernDisposedError);
  });

  it('reports presence through tap and the peers getter', async () => {
    const events: TavernHostEvent[] = [];
    const { host, peerId } = await tavernBook();
    host.tap((event) => events.push(event));

    // The guest paired before the tapper attached: the getter sees it live.
    expect(host.peers.map((peer) => peer.id)).toEqual([peerId]);

    host.kick(peerId);
    await vi.waitFor(() =>
      expect(events.some((event) => event.type === 'peer-left' && event.peer.id === peerId)).toBe(true),
    );
    expect(host.peers).toHaveLength(0);

    host.dispose();
  });

  it('throws TavernDisposedError when the stopped host is used again', async () => {
    const { host } = await tavernBook();
    host.dispose();

    expect(() => host.kick('whoever')).toThrow(TavernDisposedError);
    await expect(host.createInvitationCode()).rejects.toBeInstanceOf(TavernDisposedError);
    await expect(host.acceptAnswerCode('whatever')).rejects.toBeInstanceOf(TavernDisposedError);
  });

  it('detaches tappers when hosting ends and no-ops after', async () => {
    const { host } = await tavernBook();
    const unsubscribe = host.tap(() => {
      throw new Error('must never run after stop');
    });
    host.dispose();

    expect(() => unsubscribe()).not.toThrow();
    // Tapping after dispose returns a no-op subscription instead of throwing.
    expect(() => host.tap(() => undefined)).not.toThrow();
  });

  it('emits a dispose tap event when the session ends', async () => {
    const events: TavernGuestEvent[] = [];
    const { guest } = await tavernBook();
    guest.tap((event) => events.push(event));

    guest.dispose();
    expect(events).toContainEqual({ type: 'dispose' });
  });

  it('routes a throwing snapshot read to a warning event instead of crashing', async () => {
    const { rtc } = createFakeRtc();
    const warnings: TavernHostEvent[] = [];
    const host = hostTavern({
      rtc,
      subject: {
        onChanged: () => () => undefined,
        onRemoved: () => () => undefined,
        snapshot: () => {
          throw new Error('corrupted subject');
        },
      },
    });
    host.tap((event) => warnings.push(event));

    const joined = await joinTavern({
      invitationCode: await host.createInvitationCode(),
      mount: () => null,
      name: 'Sam',
      rtc,
    });
    await host.acceptAnswerCode(joined.answerCode);

    // The joining guest's initial snapshot read failed: warned, not thrown.
    await vi.waitFor(() =>
      expect(warnings.some((event) => event.type === 'warning' && event.message === 'corrupted subject')).toBe(true),
    );
    // The warning carries the original error, not only its message.
    expect(warnings.some((event) => event.type === 'warning' && event.error instanceof Error)).toBe(true);
    host.dispose();
  });

  it('rejects ready when the guest leaves before the first snapshot', async () => {
    const { rtc } = createFakeRtc();
    const host = hostTavern({
      rtc,
      subject: {
        onChanged: () => () => undefined,
        onRemoved: () => () => undefined,
        snapshot: () => ({ title: 'Draft' }),
      },
    });
    const joined = await joinTavern<{ id: string }>({
      invitationCode: await host.createInvitationCode(),
      mount: (snapshot) => ({ id: 'book-1', ...(snapshot as object) }),
      name: 'Sam',
      rtc,
    });

    // The answer was never accepted, so no snapshot can arrive: leaving settles ready.
    joined.guest.dispose();
    await expect(joined.ready).rejects.toBeInstanceOf(TavernDisposedError);

    host.dispose();
  });

  it('rejects ready with a TavernError when the channel fails before the first snapshot', async () => {
    const { failIce, rtc } = createFakeRtc();
    const host = hostTavern({
      rtc,
      subject: {
        onChanged: () => () => undefined,
        onRemoved: () => () => undefined,
        snapshot: () => ({ title: 'Draft' }),
      },
    });
    // Fail the next pairing at the ICE stage: the flag must be set before the handshake.
    failIce();
    const joined = await joinTavern<{ id: string }>({
      invitationCode: await host.createInvitationCode(),
      mount: (snapshot) => ({ id: 'book-1', ...(snapshot as object) }),
      name: 'Sam',
      rtc,
    });

    await host.acceptAnswerCode(joined.answerCode).catch(() => undefined);
    await expect(joined.ready).rejects.toBeInstanceOf(TavernError);

    host.dispose();
  });
});
