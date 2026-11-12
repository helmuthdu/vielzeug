import type { MeshAnswer, MeshInvitation, MeshProtocol } from '@vielzeug/mesh';

import { TavernPairingError } from './errors';

/** Snapshots can be large; the default mesh frame cap is too tight for whole documents. */
export const DEFAULT_MAX_MESSAGE_BYTES = 512 * 1024;

/** What travels guest to host: a named command and its arguments, tagged for rejection. */
export interface WireCommand {
  readonly args: unknown[];
  readonly id: string;
  readonly name: string;
}

export interface WireProtocol extends MeshProtocol {
  toGuest: {
    notice: unknown;
    rejected: { commandId: string; message: string };
    snapshot: unknown;
  };
  toHost: {
    command: WireCommand;
  };
}

export const commandId = (): string => `cmd-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

/** Runtime guard for the wire command shape: the protocol is Tavern's, so Tavern validates it. */
export function parseWireCommand(raw: unknown): WireCommand | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { args, id, name } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || typeof name !== 'string' || !Array.isArray(args)) return null;
  return { args, id, name };
}

/**
 * Reclassifies a mesh pairing failure as the tavern-level user mistake it is:
 * the code the consumer pasted could not be used. The message is preserved and
 * the original error is chained as `cause`.
 */
export function toPairingError(error: unknown): TavernPairingError {
  const message = error instanceof Error ? error.message : 'That code could not be read.';
  return new TavernPairingError(message, { cause: error });
}

/** narrows a decoded pairing code to the guest's half of the handshake. */
export function isMeshAnswer(decoded: MeshInvitation | MeshAnswer): decoded is MeshAnswer {
  return 'proof' in decoded;
}

/** narrows a decoded pairing code to the host's half of the handshake. */
export function isMeshInvitation(decoded: MeshInvitation | MeshAnswer): decoded is MeshInvitation {
  return 'secret' in decoded;
}
