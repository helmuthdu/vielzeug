import { base64UrlToText, textToBase64Url } from '@vielzeug/arsenal';
import { MeshPairingError } from './errors';
import type { MeshAnswer, MeshInvitation } from './types';

/** Structural guard shared by the plain and QR pairing codecs. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isInvitation(value: Record<string, unknown>): value is Record<string, unknown> & MeshInvitation {
  return (
    value.v === 1 &&
    typeof value.sessionId === 'string' &&
    typeof value.secret === 'string' &&
    typeof value.expiresAt === 'number' &&
    typeof value.sdp === 'string'
  );
}

function isAnswer(value: Record<string, unknown>): value is Record<string, unknown> & MeshAnswer {
  return (
    value.v === 1 &&
    typeof value.sessionId === 'string' &&
    typeof value.proof === 'string' &&
    isRecord(value.peer) &&
    typeof value.peer.id === 'string' &&
    value.peer.id !== '' &&
    (value.peer.name === undefined || typeof value.peer.name === 'string') &&
    typeof value.sdp === 'string'
  );
}

/**
 * Validate a decoded pairing payload. Shared by `meshCodec` and `meshQrCodec`
 * so both encodings enforce the same shape/version contract.
 *
 * @throws {MeshPairingError} On unsupported version or unrecognized shape.
 */
export function parsePairingPayload(parsed: unknown): MeshInvitation | MeshAnswer {
  if (!isRecord(parsed) || parsed.v !== 1) {
    throw new MeshPairingError('Unsupported pairing payload version');
  }
  if (isInvitation(parsed) || isAnswer(parsed)) {
    return parsed;
  }
  throw new MeshPairingError('Unrecognized pairing payload shape');
}

/**
 * Compact JSON → base64url codec for pairing payloads. Pure and transport-free
 * so alternative encodings (compressed, QR-optimized) can be added later
 * without touching the transport.
 *
 * @example
 * ```ts
 * const invitation = await host.createInvitation();
 * const text = meshCodec.encode(invitation);   // copy/paste or navigator.share
 * const answer = await guest.acceptInvitation(meshCodec.decode(text));
 * await host.acceptAnswer(meshCodec.decode(meshCodec.encode(answer)));
 * ```
 *
 * @throws {MeshPairingError} On malformed text or unsupported payload shape/version.
 */
export const meshCodec = {
  decode(text: string): MeshInvitation | MeshAnswer {
    let parsed: unknown;
    try {
      parsed = JSON.parse(base64UrlToText(text.trim()));
    } catch (cause) {
      throw new MeshPairingError('Malformed pairing payload', { cause });
    }
    return parsePairingPayload(parsed);
  },
  encode(payload: MeshInvitation | MeshAnswer): string {
    return textToBase64Url(JSON.stringify(payload));
  },
};
