import { MeshPairingError } from './errors';

/**
 * Compact SDP serialization for pairing payloads. A data-channel-only
 * SDP is mostly boilerplate; the remote side only needs the ICE credentials,
 * DTLS fingerprint, setup role, mid, and candidates. `compactSdp` extracts
 * those fields and `expandSdp` rebuilds a minimal valid SDP for
 * `setRemoteDescription`.
 *
 * `compactSdp` returns `null` for shapes it cannot safely represent
 * (multiple m-lines, missing credentials), letting callers keep the raw SDP.
 */

export interface CompactSdp {
  /** `a=candidate:` lines, prefix stripped. */
  c: string[];
  /** sha-256 fingerprint, hex without colons. */
  f: string;
  /** `a=mid`. */
  m: string;
  /** `a=max-message-size`. */
  mm?: number;
  /** `a=ice-pwd`. */
  p: string;
  /** `a=setup` role. */
  s: string;
  /** `a=sctp-port`. */
  sp?: number;
  /** `a=ice-ufrag`. */
  u: string;
}

function isCompactSdp(value: unknown): value is CompactSdp {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.u === 'string' &&
    typeof c.p === 'string' &&
    typeof c.f === 'string' &&
    typeof c.s === 'string' &&
    typeof c.m === 'string' &&
    Array.isArray(c.c) &&
    c.c.every((line) => typeof line === 'string')
  );
}

/** Returns the expanded SDP unchanged when `value` is already a string. */
export function restoreSdp(value: unknown): string {
  if (typeof value === 'string') return value;
  if (isCompactSdp(value)) return expandSdp(value);
  throw new MeshPairingError('Malformed pairing payload');
}

export function compactSdp(sdp: string): CompactSdp | null {
  let ufrag = '';
  let pwd = '';
  let fingerprint = '';
  let setup = '';
  let mid = '0';
  let sctpPort: number | undefined;
  let maxMessageSize: number | undefined;
  const candidates: string[] = [];
  let mLines = 0;

  for (const line of sdp.split(/\r?\n/)) {
    if (line.startsWith('m=')) mLines += 1;
    else if (line.startsWith('a=ice-ufrag:')) ufrag = line.slice(12);
    else if (line.startsWith('a=ice-pwd:')) pwd = line.slice(10);
    else if (line.startsWith('a=fingerprint:sha-256 ')) fingerprint = line.slice(22).replaceAll(':', '').toUpperCase();
    else if (line.startsWith('a=setup:')) setup = line.slice(8);
    else if (line.startsWith('a=mid:')) mid = line.slice(6);
    else if (line.startsWith('a=sctp-port:')) sctpPort = Number(line.slice(12));
    else if (line.startsWith('a=max-message-size:')) maxMessageSize = Number(line.slice(19));
    else if (line.startsWith('a=candidate:')) candidates.push(line.slice(12));
  }

  if (mLines !== 1 || !ufrag || !pwd || !fingerprint) return null;
  return {
    c: candidates,
    f: fingerprint,
    m: mid,
    p: pwd,
    s: setup || 'actpass',
    ...(maxMessageSize ? { mm: maxMessageSize } : {}),
    ...(sctpPort ? { sp: sctpPort } : {}),
    u: ufrag,
  };
}

/**
 * Canonical signing form: the compact serialization when the SDP is
 * recognizable, else the raw text. `compactSdp` is lossless over the fields
 * it keeps, so the rebuilt `mq2.` SDP canonicalizes identically to the
 * original — a proof computed over one verifies against the other.
 */
export function canonicalSdp(sdp: string): string {
  const compact = compactSdp(sdp);
  return compact ? JSON.stringify(compact) : sdp;
}

export function expandSdp(compact: CompactSdp): string {
  const colonHex = compact.f.replace(/(..)/g, '$1:').slice(0, -1);
  return `${[
    'v=0',
    'o=- 0 2 IN IP4 0.0.0.0',
    's=-',
    't=0 0',
    `a=group:BUNDLE ${compact.m}`,
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    `a=ice-ufrag:${compact.u}`,
    `a=ice-pwd:${compact.p}`,
    `a=fingerprint:sha-256 ${colonHex}`,
    `a=setup:${compact.s}`,
    `a=mid:${compact.m}`,
    `a=sctp-port:${compact.sp ?? 5000}`,
    ...(compact.mm ? [`a=max-message-size:${compact.mm}`] : []),
    ...compact.c.map((line) => `a=candidate:${line}`),
    '',
  ].join('\r\n')}`;
}
