import { ProtocolError } from './errors';

// ─── Outgoing frames (client → server) ────────────────────────────────────────

export type OutMessageFrame = { channel?: string; event: string; payload: unknown; type: 'message' };
export type OutSubscribeFrame = { channel: string; type: 'subscribe' };
export type OutUnsubscribeFrame = { channel: string; type: 'unsubscribe' };
export type OutJoinFrame = { room: string; type: 'join' };
export type OutLeaveFrame = { room: string; type: 'leave' };
export type OutPresenceFrame = { room: string; state: unknown; type: 'presence' };
export type OutPingFrame = { ts: number; type: 'ping' };

export type OutFrame =
  | OutJoinFrame
  | OutLeaveFrame
  | OutMessageFrame
  | OutPingFrame
  | OutPresenceFrame
  | OutSubscribeFrame
  | OutUnsubscribeFrame;

// ─── Incoming frames (server → client) ────────────────────────────────────────

export type InMessageFrame = { channel?: string; event: string; payload: unknown; type: 'message' };
export type InSubscribedFrame = { channel: string; type: 'subscribed' };
export type InUnsubscribedFrame = { channel: string; type: 'unsubscribed' };
export type InJoinedFrame = { room: string; type: 'joined' };
export type InLeftFrame = { room: string; type: 'left' };
export type InPresenceStateFrame = { members: Record<string, unknown>; room: string; type: 'presence_state' };
export type InPresenceJoinFrame = { id: string; room: string; state: unknown; type: 'presence_join' };
export type InPresenceLeaveFrame = { id: string; room: string; type: 'presence_leave' };
export type InPongFrame = { ts: number; type: 'pong' };
export type InErrorFrame = { code: string; message: string; type: 'error' };

export type InFrame =
  | InErrorFrame
  | InJoinedFrame
  | InLeftFrame
  | InMessageFrame
  | InPongFrame
  | InPresenceJoinFrame
  | InPresenceLeaveFrame
  | InPresenceStateFrame
  | InSubscribedFrame
  | InUnsubscribedFrame;

// ─── Codec ────────────────────────────────────────────────────────────────────

/**
 * Encode an outgoing frame to a JSON string.
 * @internal
 */
export function encode(frame: OutFrame): string {
  return JSON.stringify(frame);
}

/**
 * Parse a raw MessageEvent data string into a typed InFrame.
 * Throws `ProtocolError` if the data is not valid JSON or missing the `type` field.
 * @internal
 */
export function decode(raw: unknown): InFrame {
  if (typeof raw !== 'string') {
    throw new ProtocolError('Expected string message data', raw);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new ProtocolError('JSON parse error', raw);
  }

  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    !('type' in parsed) ||
    typeof (parsed as { type: unknown }).type !== 'string'
  ) {
    throw new ProtocolError('Missing or invalid "type" field', parsed);
  }

  return parsed as InFrame;
}
