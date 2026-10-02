import { MeshPairingError } from '@vielzeug/mesh';
import { createFakeRtc } from '@vielzeug/mesh/testing';
import { describe, expect, it, vi } from 'vitest';
import { hostTavern, joinTavern, TavernError, type TavernNotices, TavernPairingError } from '../index';

interface BookHarness {
  applied: { args: unknown[]; name: string }[];
  guest: Awaited<ReturnType<typeof joinTavern<{ id: string }>>>['guest'];
  host: ReturnType<typeof hostTavern>;
  mounted: unknown[];
  peerId: string;
}

/** Hosts a book whose title changes through the `rename` command, plus a guest that mirrors it. */
async function tavernBook(
  options: { notices?: TavernNotices; onEnded?(subject: { id: string; title: string }): void } = {},
): Promise<BookHarness> {
  const { rtc } = createFakeRtc();
  const applied: { args: unknown[]; name: string }[] = [];
  const mounted: unknown[] = [];
  let broadcast: (() => void) | undefined;
  let book = { title: 'Draft' };

  const host = hostTavern({
    commands: {
      apply: (name, args) => {
        applied.push({ args: [...args], name });
        if (name === 'rename') {
          book = { ...book, title: args[0] as string };
          broadcast?.();
        }
      },
      has: (name) => name === 'rename',
    },
    notices: options.notices,
    rtc,
    subjectId: 'book-1',
    subjects: {
      onChanged: (listener) => {
        broadcast = listener;
        return () => undefined;
      },
      onRemoved: () => () => undefined,
      snapshot: () => ({ ...book }),
    },
  });

  const joined = await joinTavern<{ id: string; title: string }>({
    invitationText: await host.createInvitationText(),
    mount: (snapshot) => {
      const parsed = snapshot as { title: string };
      mounted.push(parsed.title);
      return { id: 'book-1', ...parsed };
    },
    name: 'Sam',
    notices: options.notices,
    onEnded: options.onEnded,
    onJoined: () => undefined,
    rtc,
  });
  const peer = await host.acceptAnswerText(joined.answerText);

  return { applied, guest: joined.guest, host, mounted, peerId: peer.id };
}

describe('tavern', () => {
  it('pairs a guest, mirrors the subject, and applies forwarded commands on the host', async () => {
    const { applied, guest, host, mounted } = await tavernBook();

    // The first snapshot arrives on join.
    await vi.waitFor(() => expect(mounted).toEqual(['Draft']));

    guest.sendCommand('book-1', 'rename', ['Final']);
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
      commands: { apply: () => undefined, has: () => true },
      rtc,
      subjectId: 'book-1',
      subjects: {
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
      invitationText: await host.createInvitationText(),
      mount: (snapshot) => ({ id: 'book-1', ...(snapshot as object) }),
      name: 'Sam',
      rtc,
    });
    await host.acceptAnswerText(joined.answerText);

    // Wait for the microtask to flush.
    await new Promise((resolve) => setTimeout(resolve, 10));

    // The initial join snapshot plus exactly one coalesced update — not three.
    expect(broadcasts.length).toBeLessThanOrEqual(2);

    joined.guest.dispose();
    host.dispose();
  });

  it('rejects foreign subjects and unknown commands with a message', async () => {
    const { rtc } = createFakeRtc();
    const rejected: string[] = [];
    const host = hostTavern({
      commands: { apply: () => undefined, has: (name) => name === 'rename' },
      rtc,
      subjectId: 'book-1',
      subjects: {
        onChanged: () => () => undefined,
        onRemoved: () => () => undefined,
        snapshot: () => ({ title: 'Draft' }),
      },
    });

    const joined = await joinTavern<{ id: string }>({
      invitationText: await host.createInvitationText(),
      mount: (snapshot) => ({ id: 'book-1', ...(snapshot as object) }),
      name: 'Sam',
      onRejected: (message) => rejected.push(message),
      rtc,
    });
    await host.acceptAnswerText(joined.answerText);

    joined.guest.sendCommand('other-book', 'rename', []);
    await vi.waitFor(() => expect(rejected).toHaveLength(1));
    expect(rejected[0]).toContain('out-of-session');

    joined.guest.sendCommand('book-1', 'erase', []);
    await vi.waitFor(() => expect(rejected).toHaveLength(2));

    joined.guest.dispose();
    host.dispose();
  });

  it('relays host notices to the guests through the serializer', async () => {
    const relayed: string[] = [];
    const notices = {
      fromWire: (wire: unknown): void => {
        relayed.push(String(wire));
      },
      toWire: (notice: unknown): unknown => (typeof notice === 'string' ? notice : null),
    };
    const { guest, host } = await tavernBook({ notices });

    host.relayNotice('Chapter 3 begins');
    host.relayNotice({ ignored: true });
    await vi.waitFor(() => expect(relayed).toEqual(['Chapter 3 begins']));

    guest.dispose();
    host.dispose();
  });

  it('reports the mounted subject when the guest leaves', async () => {
    const { rtc } = createFakeRtc();
    const host = hostTavern({
      commands: { apply: () => undefined, has: () => true },
      rtc,
      subjectId: 'book-1',
      subjects: {
        onChanged: () => () => undefined,
        onRemoved: () => () => undefined,
        snapshot: () => ({ title: 'Draft' }),
      },
    });

    const ended: string[] = [];
    const joined = await joinTavern<{ id: string }>({
      invitationText: await host.createInvitationText(),
      mount: (snapshot) => ({ id: 'book-1', ...(snapshot as object) }),
      name: 'Sam',
      onEnded: (subject) => ended.push(subject.id),
      rtc,
    });
    await host.acceptAnswerText(joined.answerText);

    joined.guest.dispose();
    expect(ended).toEqual(['book-1']);

    // Dispose again after the session already ended: onEnded fires exactly once.
    joined.guest.dispose();
    expect(ended).toEqual(['book-1']);

    host.dispose();
  });

  it('throws a typed pairing error when given the wrong code kind', async () => {
    const { rtc } = createFakeRtc();
    const host = hostTavern({
      commands: { apply: () => undefined, has: () => true },
      rtc,
      subjectId: 'book-1',
      subjects: {
        onChanged: () => () => undefined,
        onRemoved: () => () => undefined,
        snapshot: () => ({ title: 'Draft' }),
      },
    });

    // Passing an invitation where an answer is expected — the wrong code kind.
    const invitation = await host.createInvitationText();
    await expect(host.acceptAnswerText(invitation)).rejects.toThrow(TavernPairingError);

    host.dispose();
  });

  it('wraps a malformed answer code as TavernPairingError with the cause chained', async () => {
    const { host } = await tavernBook();

    const rejection = await host.acceptAnswerText('not-a-pairing-code').catch((error: unknown) => error);
    expect(rejection).toBeInstanceOf(TavernPairingError);
    expect((rejection as TavernPairingError).name).toBe('TavernPairingError');
    expect((rejection as TavernPairingError).cause).toBeInstanceOf(MeshPairingError);

    host.dispose();
  });

  it('wraps a malformed invitation code as TavernPairingError', async () => {
    const { rtc } = createFakeRtc();
    await expect(
      joinTavern({ invitationText: 'not-a-pairing-code', mount: () => null, name: 'Sam', rtc }),
    ).rejects.toBeInstanceOf(TavernPairingError);
  });

  it('fires host onEnded exactly once when the subject is removed', async () => {
    const { rtc } = createFakeRtc();
    let removed: (() => void) | undefined;
    let ended = 0;
    const host = hostTavern({
      commands: { apply: () => undefined, has: () => true },
      onEnded: () => {
        ended += 1;
      },
      rtc,
      subjectId: 'book-1',
      subjects: {
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
      commands: { apply: () => undefined, has: () => true },
      onEnded: () => {
        ended += 1;
      },
      rtc,
      subjectId: 'book-1',
      subjects: {
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
    const { guest, host, peerId } = await tavernBook({ onEnded: (subject) => ended.push(subject.id) });

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

  it('throws TavernError when sending a command after the session ended', async () => {
    const { guest } = await tavernBook();
    guest.dispose();
    expect(() => guest.sendCommand('book-1', 'rename', [])).toThrow(TavernError);
  });

  it('routes a throwing snapshot read to onWarning instead of crashing', async () => {
    const { rtc } = createFakeRtc();
    const warnings: string[] = [];
    const host = hostTavern({
      commands: { apply: () => undefined, has: () => true },
      onWarning: (message) => warnings.push(message),
      rtc,
      subjectId: 'book-1',
      subjects: {
        onChanged: () => () => undefined,
        onRemoved: () => () => undefined,
        snapshot: () => {
          throw new Error('corrupted subject');
        },
      },
    });

    const joined = await joinTavern({
      invitationText: await host.createInvitationText(),
      mount: () => null,
      name: 'Sam',
      rtc,
    });
    await host.acceptAnswerText(joined.answerText);

    // The joining guest's initial snapshot read failed — warned, not thrown.
    await vi.waitFor(() => expect(warnings).toContain('corrupted subject'));
    host.dispose();
  });
});
