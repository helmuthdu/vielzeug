import {
  createMeshHost,
  type MeshAnswer,
  type MeshInvitation,
  MeshPairingError,
  type MeshPeer,
  meshQrCodec,
} from '@vielzeug/mesh';
import {
  DEFAULT_MAX_MESSAGE_BYTES,
  isMeshAnswer,
  parseWireCommand,
  toPairingError,
  type WireProtocol,
} from './_protocol';
import { createTappers } from './_tappers';
import { TavernDisposedError, TavernPairingError } from './errors';
import type { TavernHost, TavernHostEvent, TavernHostOptions } from './types';

/**
 * Starts hosting one subject over mesh. Every guest command is validated and applied
 * through the command table; local changes re-broadcast the snapshot (coalesced on a
 * microtask); removal ends the session.
 */
export function hostTavern(options: TavernHostOptions): TavernHost {
  const host = createMeshHost<WireProtocol>({
    maxMessageBytes: DEFAULT_MAX_MESSAGE_BYTES,
    rtc: options.rtc,
  });
  const tappers = createTappers<TavernHostEvent>();
  let closed = false;
  let flushScheduled = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    for (const off of detach.splice(0)) off();
    host.dispose();
    tappers.emit({ type: 'dispose' });
    tappers.stop();
    options.onEnded?.();
  };
  const disposedError = (): TavernDisposedError => new TavernDisposedError('This host has stopped.');
  const warn = (error: unknown): void => {
    tappers.emit({ error, message: error instanceof Error ? error.message : String(error), type: 'warning' });
  };

  /** Reads the snapshot for a broadcast; a throwing read warns instead of crashing the host. */
  const readSnapshot = (): unknown => {
    try {
      return options.subject.snapshot();
    } catch (error) {
      warn(error);
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
   * calls, so an unknown name or a rule violation is all the host can ever reject with.
   */
  const handleGuestCommand = (peerId: string, raw: unknown): void => {
    const command = parseWireCommand(raw);
    if (!command) {
      host.send(peerId, 'rejected', { commandId: '', message: 'That command could not be read.' });
      return;
    }
    // A named session checks every command's target: missing and mismatched targets are
    // rejected before the table runs, so a guest cannot opt out of naming its subject.
    // (The command table stays the authorization boundary; this guards honest misrouting.)
    if (options.subject.id !== undefined && command.target !== options.subject.id) {
      host.send(peerId, 'rejected', {
        commandId: command.id,
        message: 'That command does not target the hosted subject.',
      });
      return;
    }
    // Own-property lookup only: a guest must not reach Object.prototype members.
    const table = options.commands;
    const apply = table && Object.hasOwn(table, command.name) ? table[command.name] : undefined;
    if (typeof apply !== 'function') {
      host.send(peerId, 'rejected', {
        commandId: command.id,
        message: `The host has no command named "${command.name}".`,
      });
      return;
    }
    try {
      apply(command.args);
    } catch (error) {
      host.send(peerId, 'rejected', {
        commandId: command.id,
        message: error instanceof Error ? error.message : 'The host could not apply the command.',
      });
    }
  };

  const detach = [
    host.on('command', ({ peerId, payload }) => handleGuestCommand(peerId, payload)),
    options.subject.onChanged(broadcastSnapshot),
    options.subject.onRemoved(close),
    host.tap((event) => {
      if (event.type === 'peer-joined') {
        const snapshot = readSnapshot();
        if (snapshot !== null && snapshot !== undefined) host.send(event.peer.id, 'snapshot', snapshot);
        tappers.emit({ peer: event.peer, type: 'peer-joined' });
      }
      if (event.type === 'peer-left') tappers.emit({ peer: event.peer, reason: event.reason, type: 'peer-left' });
      if (event.type === 'error') warn(event.error);
    }),
  ];

  return {
    acceptAnswerCode: async (code: string): Promise<MeshPeer> => {
      if (closed) throw disposedError();
      let decoded: MeshInvitation | MeshAnswer;
      try {
        decoded = await meshQrCodec.decode(code);
      } catch (error) {
        throw error instanceof MeshPairingError ? toPairingError(error) : error;
      }
      if (!isMeshAnswer(decoded)) {
        throw new TavernPairingError('That code is an invitation, not a guest answer.');
      }
      try {
        return await host.acceptAnswer(decoded);
      } catch (error) {
        throw error instanceof MeshPairingError ? toPairingError(error) : error;
      }
    },
    createInvitationCode: async () => {
      if (closed) throw disposedError();
      return meshQrCodec.encode(await host.createInvitation());
    },
    get disposalSignal() {
      return host.disposalSignal;
    },
    dispose: close,
    get disposed() {
      return closed;
    },
    kick: (peerId: string): void => {
      if (closed) throw disposedError();
      host.kick(peerId);
    },
    get peers(): readonly MeshPeer[] {
      return [...host.peers.values()];
    },
    relayNotice: (notice: unknown): void => {
      if (closed) return;
      const wire = options.serializeNotice ? options.serializeNotice(notice) : null;
      if (wire !== null && wire !== undefined) host.broadcast('notice', wire);
    },
    tap: tappers.tap,
    [Symbol.dispose]() {
      close();
    },
  };
}
