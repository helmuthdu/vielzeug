import {
  createMeshGuest,
  createMeshHost,
  type MeshAnswer,
  type MeshInvitation,
  MeshPairingError,
  type MeshPeer,
  type MeshProtocol,
  type MeshRtcFactory,
  meshQrCodec,
} from '@vielzeug/mesh';

import { TavernError, TavernPairingError } from './errors';

export { TavernError, TavernPairingError };

/**
 * Reclassifies a mesh pairing failure as the tavern-level user mistake it is:
 * the code the consumer pasted could not be used. The message is preserved and
 * the original error is chained as `cause`.
 */
function toPairingError(error: unknown): TavernPairingError {
  const message = error instanceof Error ? error.message : 'That code could not be read.';
  return new TavernPairingError(message, { cause: error });
}

/**
 * Table sessions over `@vielzeug/mesh`: one host owns the canonical state of a subject, guests
 * mirror it and forward every command through the host's command table, so guest actions follow
 * exactly the same code path as host actions.
 *
 * The consumer supplies the seams, which commands exist, how subject state is read and mounted,
 * how notices cross between the wire and the local UI. Tavern owns the pairing, the protocol,
 * command validation, snapshot broadcasting, notice relaying, and presence.
 */

/** What the host can do on behalf of a guest. */
export interface TavernCommands {
  /** Applies the command; throwing rejects the guest with the error's message. */
  apply(name: string, args: readonly unknown[]): unknown;
  /** Whether a command name is known; unknown names reject without applying. */
  has(name: string): boolean;
}

/**
 * How the host reads and watches the subject it is sharing. All three close over whatever
 * subject state the consumer owns: the host routes by `subjectId`, not by a subject object.
 */
export interface TavernSubjects {
  /** Subscribes to local changes of the hosted subject: the re-broadcast trigger. */
  onChanged(listener: () => void): () => void;
  /** Subscribes to the hosted subject's removal: hosting ends when it fires. */
  onRemoved(listener: () => void): () => void;
  /** Reads the snapshot to broadcast; null while the subject is missing. */
  snapshot(): unknown;
}

/**
 * Notice relay between host and guests. Notices cross the wire as opaque values: each client
 * translates locally.
 *
 * **Echo guard**: a tab that both hosts and guests must guard against re-broadcasting a
 * wire-originated notice back to its own guests: `fromWire` emits locally, the host's local
 * subscription picks it up, and without a guard it would loop. The consumer owns this guard
 * because only they know their local event system; one boolean set during `fromWire` and
 * checked in `toWire` is sufficient.
 */
export interface TavernNotices {
  /** Re-emits a received wire notice locally. */
  fromWire(wire: unknown): void;
  /** Serializes a local notice for the wire; null skips this one. */
  toWire(notice: unknown): unknown | null;
}

interface WireProtocol extends MeshProtocol {
  toGuest: {
    notice: unknown;
    rejected: { commandId: string; message: string };
    snapshot: unknown;
  };
  toHost: {
    command: { args: unknown[]; id: string; name: string; subjectId: string };
  };
}

/** Snapshots can be large; the default mesh frame cap is too tight for whole documents. */
const DEFAULT_MAX_MESSAGE_BYTES = 512 * 1024;

const commandId = (): string => `cmd-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

/** Runtime guard for the wire command shape: the protocol is Tavern's, so Tavern validates it. */
function parseWireCommand(raw: unknown): { args: unknown[]; id: string; name: string; subjectId: string } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { args, id, name, subjectId } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof subjectId !== 'string' || !Array.isArray(args)) {
    return null;
  }
  return { args, id, name, subjectId };
}

// ---------------------------------------------------------------------------
// Host
// ---------------------------------------------------------------------------

export interface TavernHostOptions {
  commands: TavernCommands;
  notices?: TavernNotices;
  /** Hosting ended: the subject was removed or the host was disposed. Fires exactly once. */
  onEnded?(): void;
  onPeerJoined?(peer: MeshPeer): void;
  onPeerLeft?(peer: MeshPeer): void;
  onPeersChanged?(peers: MeshPeer[]): void;
  onWarning?(message: string): void;
  rtc?: MeshRtcFactory;
  /** The id of the subject being hosted: guest commands targeting anything else reject. */
  subjectId: string;
  subjects: TavernSubjects;
}

export interface TavernHost {
  /** Consumes a guest's answer code; resolves with the peer once the channel is open. */
  acceptAnswerText(text: string): Promise<MeshPeer>;
  /** Produces a single-use invitation code, QR-compact when the environment allows. */
  createInvitationText(): Promise<string>;
  /** `AbortSignal` aborted when hosting ends. */
  readonly disposalSignal: AbortSignal;
  /** Stops hosting: closes every channel and detaches all subscriptions. */
  dispose(): void;
  /** Whether hosting has ended: the subject was removed or `dispose()` ran. */
  readonly disposed: boolean;
  kick(peerId: string): void;
  /** Relays one local notice to every guest; the serializer decides what crosses. */
  relayNotice(notice: unknown): void;
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
}

/**
 * Starts hosting one subject. Every guest command is validated and applied through the
 * command table; local changes re-broadcast the snapshot (coalesced on a microtask); removal
 * ends the session.
 */
export function hostTavern(options: TavernHostOptions): TavernHost {
  const host = createMeshHost<WireProtocol>({
    maxMessageBytes: DEFAULT_MAX_MESSAGE_BYTES,
    rtc: options.rtc,
  });
  let closed = false;
  let flushScheduled = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    for (const off of detach.splice(0)) off();
    host.dispose();
    options.onEnded?.();
  };

  /** Reads the snapshot for a broadcast; a throwing read warns instead of crashing the host. */
  const readSnapshot = (): unknown => {
    try {
      return options.subjects.snapshot();
    } catch (error) {
      options.onWarning?.(error instanceof Error ? error.message : 'Reading the snapshot failed.');
      return null;
    }
  };

  /** Coalesces broadcasts on a microtask so bursts of local changes ship one snapshot. */
  const broadcastSnapshot = (): void => {
    if (closed || flushScheduled) return;
    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;
      if (closed) return;
      const snapshot = readSnapshot();
      if (snapshot !== null && snapshot !== undefined) host.broadcast('snapshot', snapshot);
    });
  };

  /**
   * Applies a guest command through the command table: the same table the host's own UI
   * calls, so an unknown name, a foreign subject id or a rule violation is all the host
   * can ever reject with.
   */
  const handleGuestCommand = (peerId: string, raw: unknown): void => {
    const command = parseWireCommand(raw);
    if (!command || !options.commands.has(command.name) || command.subjectId !== options.subjectId) {
      host.send(peerId, 'rejected', {
        commandId: command?.id ?? '',
        message: 'The host rejected an unknown or out-of-session command.',
      });
      return;
    }
    try {
      options.commands.apply(command.name, command.args);
    } catch (error) {
      host.send(peerId, 'rejected', {
        commandId: command.id,
        message: error instanceof Error ? error.message : 'The host could not apply the command.',
      });
    }
  };

  const detach = [
    host.on('command', ({ peerId, payload }) => handleGuestCommand(peerId, payload)),
    options.subjects.onChanged(broadcastSnapshot),
    options.subjects.onRemoved(close),
    host.tap((event) => {
      if (event.type === 'peer-joined' || event.type === 'peer-left') {
        options.onPeersChanged?.([...host.peers.values()]);
      }
      if (event.type === 'peer-joined') {
        const snapshot = readSnapshot();
        if (snapshot !== null && snapshot !== undefined) host.send(event.peer.id, 'snapshot', snapshot);
        options.onPeerJoined?.(event.peer);
      }
      if (event.type === 'peer-left') options.onPeerLeft?.(event.peer);
      if (event.type === 'error') options.onWarning?.(event.error.message);
    }),
  ];

  return {
    acceptAnswerText: async (text: string): Promise<MeshPeer> => {
      let decoded: MeshInvitation | MeshAnswer;
      try {
        decoded = await meshQrCodec.decode(text);
      } catch (error) {
        throw error instanceof MeshPairingError ? toPairingError(error) : error;
      }
      if (!('proof' in decoded)) {
        throw new TavernPairingError('That code is an invitation, not a guest answer.');
      }
      try {
        return await host.acceptAnswer(decoded);
      } catch (error) {
        throw error instanceof MeshPairingError ? toPairingError(error) : error;
      }
    },
    createInvitationText: async () => meshQrCodec.encode(await host.createInvitation()),
    get disposalSignal() {
      return host.disposalSignal;
    },
    dispose: close,
    get disposed() {
      return closed;
    },
    kick: (peerId: string): void => {
      host.kick(peerId);
    },
    relayNotice: (notice: unknown): void => {
      if (closed) return;
      const wire = options.notices ? options.notices.toWire(notice) : null;
      if (wire !== null && wire !== undefined) host.broadcast('notice', wire);
    },
    [Symbol.dispose]() {
      close();
    },
  };
}

// ---------------------------------------------------------------------------
// Guest
// ---------------------------------------------------------------------------

export interface TavernGuestOptions<Mounted> {
  /** The invitation code the host produced. */
  invitationText: string;
  /**
   * Mounts a received snapshot; the mounted value, or null to ignore. The snapshot arrives
   * as parsed JSON: validate before trusting it.
   */
  mount(snapshot: unknown): Mounted | null;
  /** The guest's display name on the channel. */
  name: string;
  notices?: TavernNotices;
  /** The channel ended after joining; the mounted value is passed for unmounting. */
  onEnded?(subject: Mounted): void;
  /** The host never accepted the answer in time. */
  onFailed?(reason: string): void;
  /** The mounted value once the first snapshot arrives. */
  onJoined?(subject: Mounted): void;
  /** The host rejected a forwarded command. */
  onRejected?(message: string): void;
  onWarning?(message: string): void;
  rtc?: MeshRtcFactory;
}

export interface TavernGuest {
  /** `AbortSignal` aborted when the session ends. */
  readonly disposalSignal: AbortSignal;
  /** Leaves the session and drops the channel. */
  dispose(): void;
  /** Whether the session has ended: the channel dropped or `dispose()` ran. */
  readonly disposed: boolean;
  /**
   * Forwards a command to the host. The subject id is the consumer's routing key: the host
   * rejects commands that do not name the subject it is hosting.
   */
  sendCommand(subjectId: string, name: string, args: readonly unknown[]): void;
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
}

/**
 * Joins a session as a guest: consumes the host's invitation and returns the answer code to
 * show back. The session goes live once the host accepts the answer and the first snapshot
 * mounts; disposing the guest (or the channel dropping) ends it exactly once.
 */
export async function joinTavern<Mounted>(
  options: TavernGuestOptions<Mounted>,
): Promise<{ answerText: string; guest: TavernGuest }> {
  let decoded: MeshInvitation | MeshAnswer;
  try {
    decoded = await meshQrCodec.decode(options.invitationText);
  } catch (error) {
    throw error instanceof MeshPairingError ? toPairingError(error) : error;
  }
  if (!('secret' in decoded)) {
    throw new TavernPairingError('That code is not a session invitation.');
  }

  const guest = createMeshGuest<WireProtocol>({
    maxMessageBytes: DEFAULT_MAX_MESSAGE_BYTES,
    rtc: options.rtc,
  });
  let mounted: Mounted | null = null;
  let ended = false;

  /** Ends the session exactly once: from the channel dropping or an explicit dispose. */
  const endSession = (): void => {
    if (ended) return;
    ended = true;
    const subject = mounted;
    mounted = null;
    for (const off of detach.splice(0)) off();
    guest.dispose();
    if (subject !== null) options.onEnded?.(subject);
  };

  const detach = [
    guest.on('snapshot', ({ payload }) => {
      const subject = options.mount(payload);
      if (subject === null || ended) return;
      if (mounted === null) {
        mounted = subject;
        options.onJoined?.(subject);
      }
    }),
    guest.on('notice', ({ payload }) => {
      options.notices?.fromWire(payload);
    }),
    guest.on('rejected', ({ payload }) => {
      options.onRejected?.(payload.message || 'The host rejected the action.');
    }),
    guest.tap((event) => {
      if (event.type !== 'status-change' && event.type !== 'peer-status-change') return;
      if (event.type === 'peer-status-change' && event.peerId !== guest.host?.id) return;
      if (event.status === 'failed' && mounted === null && !ended) {
        options.onFailed?.('The host did not accept the answer in time.');
      }
      if (event.status === 'disconnected' || event.status === 'failed') endSession();
    }),
    guest.tap((event) => {
      if (event.type === 'error') options.onWarning?.(event.error.message);
    }),
  ];

  try {
    const answer = await guest.acceptInvitation(decoded, { name: options.name });
    return {
      answerText: await meshQrCodec.encode(answer),
      guest: {
        get disposalSignal() {
          return guest.disposalSignal;
        },
        dispose: endSession,
        get disposed() {
          return ended;
        },
        sendCommand: (subjectId: string, name: string, args: readonly unknown[]): void => {
          if (ended) throw new TavernError('The session has ended.');
          guest.send('command', { args: [...args], id: commandId(), name, subjectId });
        },
        [Symbol.dispose]() {
          endSession();
        },
      },
    };
  } catch (error) {
    // A failed join must not leave the node and its subscriptions behind.
    endSession();
    throw error instanceof MeshPairingError ? toPairingError(error) : error;
  }
}
