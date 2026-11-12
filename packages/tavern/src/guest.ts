import { createMeshGuest, type MeshAnswer, type MeshInvitation, MeshPairingError, meshQrCodec } from '@vielzeug/mesh';
import { commandId, DEFAULT_MAX_MESSAGE_BYTES, isMeshInvitation, toPairingError, type WireProtocol } from './_protocol';
import { createTappers } from './_tappers';
import { TavernDisposedError, TavernError, TavernPairingError } from './errors';
import type { TavernGuestEvent, TavernGuestOptions, TavernJoinResult } from './types';

/**
 * Joins a session as a guest: consumes the host's invitation code and returns the answer
 * code to show back. The session goes live once the host accepts the answer and the first
 * snapshot mounts; that transition settles {@link TavernJoinResult.ready}. Disposing the
 * guest (or the channel dropping) ends the session exactly once.
 */
export async function joinTavern<Mounted>(options: TavernGuestOptions<Mounted>): Promise<TavernJoinResult<Mounted>> {
  let decoded: MeshInvitation | MeshAnswer;
  try {
    decoded = await meshQrCodec.decode(options.invitationCode);
  } catch (error) {
    throw error instanceof MeshPairingError ? toPairingError(error) : error;
  }
  if (!isMeshInvitation(decoded)) {
    throw new TavernPairingError('That code is not a session invitation.');
  }

  const guest = createMeshGuest<WireProtocol>({
    maxMessageBytes: DEFAULT_MAX_MESSAGE_BYTES,
    rtc: options.rtc,
  });
  const tappers = createTappers<TavernGuestEvent>();
  let mounted: Mounted | null = null;
  let ended = false;
  let resolveReady!: (subject: Mounted) => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<Mounted>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // A ready the consumer never awaits must not surface as an unhandled rejection.
  void ready.catch(() => undefined);

  /** Ends the session exactly once: from the channel dropping or an explicit dispose. */
  const endSession = (earlyExit: Error): void => {
    if (ended) return;
    ended = true;
    const subject = mounted;
    mounted = null;
    for (const off of detach.splice(0)) off();
    guest.dispose();
    tappers.emit({ type: 'dispose' });
    tappers.stop();
    if (subject !== null) options.onEnded?.(subject);
    else rejectReady(earlyExit);
  };

  const detach = [
    guest.on('snapshot', ({ payload }) => {
      const subject = options.mount(payload);
      if (subject === null || ended) return;
      if (mounted === null) {
        mounted = subject;
        resolveReady(subject);
      }
    }),
    guest.on('notice', ({ payload }) => {
      options.onNotice?.(payload);
    }),
    guest.on('rejected', ({ payload }) => {
      tappers.emit({
        commandId: payload.commandId,
        message: payload.message || 'The host rejected the action.',
        type: 'rejected',
      });
    }),
    guest.tap((event) => {
      // A failed ICE negotiation before the channel opens surfaces only as the raw
      // ice-state event; once a channel exists, mesh reports failed/disconnected statuses.
      if (event.type === 'ice-state' && event.state === 'failed') {
        endSession(new TavernError('The connection to the host failed.'));
        return;
      }
      if (event.type !== 'status-change' && event.type !== 'peer-status-change') return;
      if (event.type === 'peer-status-change' && event.peerId !== guest.host?.id) return;
      if (event.status === 'failed') endSession(new TavernError('The host did not accept the answer in time.'));
      if (event.status === 'disconnected') endSession(new TavernError('The host closed the session.'));
    }),
    guest.tap((event) => {
      if (event.type === 'error') {
        tappers.emit({ error: event.error, message: event.error.message, type: 'warning' });
      }
    }),
  ];

  try {
    const answer = await guest.acceptInvitation(decoded, { name: options.name });
    return {
      answerCode: await meshQrCodec.encode(answer),
      guest: {
        get disposalSignal() {
          return guest.disposalSignal;
        },
        dispose: () => endSession(new TavernDisposedError('The guest left before the first snapshot arrived.')),
        get disposed() {
          return ended;
        },
        sendCommand: (name: string, args: readonly unknown[] = [], target?: string): void => {
          if (ended) throw new TavernDisposedError('The session has ended.');
          guest.send('command', {
            args: [...args],
            id: commandId(),
            name,
            ...(target === undefined ? undefined : { target }),
          });
        },
        tap: tappers.tap,
        [Symbol.dispose]() {
          endSession(new TavernDisposedError('The guest left before the first snapshot arrived.'));
        },
      },
      ready,
    };
  } catch (error) {
    // A failed join must not leave the node and its subscriptions behind.
    const wrapped = error instanceof MeshPairingError ? toPairingError(error) : error;
    endSession(wrapped instanceof Error ? wrapped : new TavernError('The invitation could not be accepted.'));
    throw wrapped;
  }
}
