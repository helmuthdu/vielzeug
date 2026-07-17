import { PulseProtocolError } from './errors';

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

type ParsedFrame = { type: string } & Record<string, unknown>;
export type DecodedInFrame = { frame: InFrame; kind: 'known' } | { kind: 'unknown'; type: string };

// ─── Codec ────────────────────────────────────────────────────────────────────

/**
 * Encode an outgoing frame to a JSON string.
 * @internal
 */
export function encode(frame: OutFrame): string {
  return JSON.stringify(frame);
}

/**
 * Parse a raw MessageEvent data string and ensure it has a string `type` field.
 * Throws `PulseProtocolError` if the data is not valid JSON or missing the `type` field.
 * @internal
 */
export function decode(raw: unknown): ParsedFrame {
  if (typeof raw !== 'string') {
    throw new PulseProtocolError('Expected string message data', raw);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new PulseProtocolError('JSON parse error', raw);
  }

  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    !('type' in parsed) ||
    typeof (parsed as { type: unknown }).type !== 'string'
  ) {
    throw new PulseProtocolError('Missing or invalid "type" field', parsed);
  }

  return parsed as ParsedFrame;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getStringProp(frame: unknown, key: string): string | null {
  if (!isObjectRecord(frame)) return null;

  const value = frame[key];

  return typeof value === 'string' ? value : null;
}

export function isErrorFrame(frame: unknown): frame is InErrorFrame {
  return getStringProp(frame, 'code') !== null && getStringProp(frame, 'message') !== null;
}

export function isJoinedFrame(frame: unknown): frame is InJoinedFrame {
  return getStringProp(frame, 'room') !== null;
}

export function isLeftFrame(frame: unknown): frame is InLeftFrame {
  return getStringProp(frame, 'room') !== null;
}

export function isMessageFrame(frame: unknown): frame is InMessageFrame {
  if (!isObjectRecord(frame) || getStringProp(frame, 'event') === null || !('payload' in frame)) return false;

  return frame.channel === undefined || typeof frame.channel === 'string';
}

export function isPongFrame(frame: unknown): frame is InPongFrame {
  return isObjectRecord(frame) && typeof frame.ts === 'number';
}

export function isPresenceJoinFrame(frame: unknown): frame is InPresenceJoinFrame {
  return (
    isObjectRecord(frame) &&
    getStringProp(frame, 'id') !== null &&
    getStringProp(frame, 'room') !== null &&
    'state' in frame
  );
}

export function isPresenceLeaveFrame(frame: unknown): frame is InPresenceLeaveFrame {
  return getStringProp(frame, 'id') !== null && getStringProp(frame, 'room') !== null;
}

export function isPresenceStateFrame(frame: unknown): frame is InPresenceStateFrame {
  return isObjectRecord(frame) && getStringProp(frame, 'room') !== null && isObjectRecord(frame.members);
}

function isSubscribedFrame(frame: unknown): frame is InSubscribedFrame {
  return getStringProp(frame, 'channel') !== null;
}

function isUnsubscribedFrame(frame: unknown): frame is InUnsubscribedFrame {
  return getStringProp(frame, 'channel') !== null;
}

/**
 * Parse and validate known incoming frame shapes.
 * Unknown frame `type` values are passed through so callers can warn/drop them.
 * @internal
 */
export function decodeValidated(raw: unknown): DecodedInFrame {
  const frame = decode(raw) as ParsedFrame;

  switch (frame.type) {
    case 'error':
      if (isErrorFrame(frame)) return { frame, kind: 'known' };

      break;
    case 'joined':
      if (isJoinedFrame(frame)) return { frame, kind: 'known' };

      break;
    case 'left':
      if (isLeftFrame(frame)) return { frame, kind: 'known' };

      break;
    case 'message':
      if (isMessageFrame(frame)) return { frame, kind: 'known' };

      break;
    case 'pong':
      if (isPongFrame(frame)) return { frame, kind: 'known' };

      break;
    case 'presence_join':
      if (isPresenceJoinFrame(frame)) return { frame, kind: 'known' };

      break;
    case 'presence_leave':
      if (isPresenceLeaveFrame(frame)) return { frame, kind: 'known' };

      break;
    case 'presence_state':
      if (isPresenceStateFrame(frame)) return { frame, kind: 'known' };

      break;
    case 'subscribed':
      if (isSubscribedFrame(frame)) return { frame, kind: 'known' };

      break;
    case 'unsubscribed':
      if (isUnsubscribedFrame(frame)) return { frame, kind: 'known' };

      break;
    default:
      return { kind: 'unknown', type: frame.type };
  }

  throw new PulseProtocolError(`Malformed "${frame.type}" frame`, frame);
}
