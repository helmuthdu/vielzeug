import type { MeshPeer, MeshRtcFactory } from '@vielzeug/mesh';
import { hostTavern, joinTavern, type TavernGuest, type TavernHost } from '@vielzeug/tavern';
import type { GameMode, HuntSubject } from '../domain/types';
import {
  bus,
  notify as emitNotice,
  type Notice,
  type NotificationVariant,
  type SessionSubject as PrimalSubject,
  sessionPeers,
  sessionState,
} from './events';
import { campaignLogger } from './logger';
import {
  sanitizeAscentSnapshot,
  sanitizeCampaignSnapshot,
  sanitizeChallengeSnapshot,
  sanitizeExpeditionSnapshot,
} from './persistence';
import { href } from './router';
import {
  applySubjectCommand,
  mountRemoteSubject,
  SUBJECTS,
  setSessionCommandSender,
  subjectCommands,
  unmountRemoteSubject,
} from './store';

// ---------------------------------------------------------------------------
// Table sessions: backendless same-network play over @vielzeug/mesh, orchestrated by
// @vielzeug/tavern. The host owns the canonical subject (one campaign, expedition,
// ascent or Winds series); guests mirror it and forward every command through the
// store's single command table, so guest actions follow exactly the same code path
// as host actions. One session per tab: hosting ends the session this tab holds,
// and the join dialog ends it before joining.
// ---------------------------------------------------------------------------

/** What travels on the wire: the subject's kind plus its record, sanitized at both ends. */
interface WireSnapshot {
  kind: GameMode;
  record: unknown;
}

/** One sanitizer per subject kind: the same schemas backups run through. */
const SNAPSHOT_SANITIZERS: Record<GameMode, (record: unknown) => HuntSubject> = {
  ascent: sanitizeAscentSnapshot,
  campaign: sanitizeCampaignSnapshot,
  challenge: sanitizeChallengeSnapshot,
  expedition: sanitizeExpeditionSnapshot,
};

let hostNode: TavernHost | null = null;
let guestNode: TavernGuest | null = null;
let detachHost: Array<() => void> = [];
let relayingNotice = false;

/** Narrows a wire payload's kind to a subject kind the app knows. */
function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && Object.hasOwn(SUBJECTS, value);
}

function snapshotFor(subject: PrimalSubject): WireSnapshot | null {
  // The host broadcasts its canonical local record, never a mirror shadowing it in the display list.
  const record = SUBJECTS[subject.kind].local(subject.id);
  return record ? { kind: subject.kind, record } : null;
}

/** Sanitizes and mounts a received snapshot; null when the host sent something unrecognizable. */
function mountSnapshot(payload: unknown): PrimalSubject | null {
  const snapshot = payload as WireSnapshot;
  if (!isGameMode(snapshot?.kind)) {
    campaignLogger.warn('Rejected an invalid session snapshot.');
    return null;
  }
  try {
    const record = SNAPSHOT_SANITIZERS[snapshot.kind](snapshot.record);
    mountRemoteSubject(record);
    return { id: record.id, kind: record.kind };
  } catch {
    campaignLogger.warn('Rejected an invalid session snapshot.');
    return null;
  }
}

/** The notice variants the wire may carry: anything else is malformed. */
const VARIANTS = ['info', 'success', 'warning', 'error'] as const satisfies readonly NotificationVariant[];

/** The host's own notices reach the guests; a guest's relayed notice never echoes back. */
const notices = {
  fromWire: (wire: unknown): void => {
    // Wire notices are untrusted like snapshots: a malformed one is dropped, not emitted.
    const notice = wire as { count?: unknown; key?: unknown; values?: Record<string, unknown>; variant?: unknown };
    if (
      typeof notice?.key !== 'string' ||
      !VARIANTS.includes(notice.variant as NotificationVariant) ||
      (notice.count !== undefined && typeof notice.count !== 'number')
    ) {
      campaignLogger.warn('Rejected an invalid session notice.');
      return;
    }
    relayingNotice = true;
    try {
      bus.emit('notify', {
        count: notice.count as number | undefined,
        key: notice.key as never,
        values: notice.values,
        variant: notice.variant as NotificationVariant,
      });
    } finally {
      relayingNotice = false;
    }
  },
  toWire: (notice: unknown): unknown => {
    if (relayingNotice) return null;
    return wireNotice(notice as Notice);
  },
};

function wireNotice(notice: Notice): unknown {
  return { count: notice.count, key: notice.key, values: notice.values, variant: notice.variant };
}

/** Starts hosting the given subject; any session this tab already holds ends first. */
export function startSessionHost(subject: PrimalSubject, options: { rtc?: MeshRtcFactory } = {}): void {
  endSession();
  const host = hostTavern({
    commands: {
      apply: (name, args) => applySubjectCommand(name, { id: subject.id, kind: subject.kind }, args),
      has: (name) => Object.hasOwn(subjectCommands, name),
    },
    notices,
    onEnded: () => {
      // Hosting ended: the subject was removed or the host was disposed.
      sessionState.update(() => ({ mode: null, subject: null }));
      sessionPeers.update(() => []);
    },
    onPeerJoined: (peer) =>
      emitNotice('toasts.sessionPeerJoined', 'success', { values: { name: peer.name ?? 'A player' } }),
    onPeerLeft: (peer) => emitNotice('toasts.sessionPeerLeft', 'info', { values: { name: peer.name ?? 'A player' } }),
    onPeersChanged: (peers) => sessionPeers.update(() => [...peers]),
    onWarning: (message) => campaignLogger.warn('Session error', { error: message }),
    rtc: options.rtc,
    subjectId: subject.id,
    subjects: {
      onChanged: (listener) =>
        bus.on(
          'subject:updated',
          (event) => void (event.kind === subject.kind && event.id === subject.id && listener()),
        ),
      onRemoved: (listener) =>
        bus.on(
          'subject:removed',
          (event) => void (event.kind === subject.kind && event.id === subject.id && listener()),
        ),
      snapshot: () => snapshotFor(subject),
    },
  });
  hostNode = host;
  sessionState.update(() => ({ mode: 'host', subject }));
  sessionPeers.update(() => []);
  detachHost = [
    bus.on('notify', (notice) => {
      if (!relayingNotice) host.relayNotice(notice);
    }),
  ];
}

/** Produces a single-use invitation encoded for QR display or copy/paste. */
export async function createSessionInvitation(): Promise<string> {
  if (!hostNode) throw new Error('No session is being hosted.');
  return hostNode.createInvitationText();
}

/**
 * The join link carrying an invitation: what the QR, share button and copy/paste hand
 * over, so a phone camera opens the app instead of showing raw code text.
 */
export function sessionJoinLink(invitationText: string): string {
  return new URL(href('sessionJoin', { code: invitationText }), location.href).href;
}

/** Consumes a guest's answer code; resolves with the peer once the channel is open. */
export async function acceptSessionAnswer(text: string): Promise<MeshPeer> {
  if (!hostNode) throw new Error('No session is being hosted.');
  return hostNode.acceptAnswerText(text);
}

export function kickSessionPeer(peerId: string): void {
  hostNode?.kick(peerId);
}

// ---------------------------------------------------------------------------
// Guest
// ---------------------------------------------------------------------------

/**
 * Unwraps a join link's invitation from behind its `/join/` segment; plain invitation
 * text passes through untouched, and any other URL falls through to fail decoding.
 */
function invitationFromText(text: string): string {
  if (!/^https?:/i.test(text)) return text;
  const index = text.indexOf('/join/');
  if (index === -1) return text;
  const segment = text.slice(index + '/join/'.length);
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Consumes the host's invitation: the raw code or the `/join/` link carrying it, and
 * returns the answer code to show back. The session goes live once the host accepts
 * the answer and the first snapshot arrives. A guest session this tab already holds
 * ends first; a hosted one keeps running until the join dialog's one-session guard
 * ends it before joining.
 */
export async function beginSessionJoin(
  invitationText: string,
  name: string,
  options: { rtc?: MeshRtcFactory } = {},
): Promise<string> {
  stopGuest();
  const { answerText, guest } = await joinTavern<PrimalSubject>({
    invitationText: invitationFromText(invitationText),
    mount: mountSnapshot,
    name,
    notices,
    onEnded: (subject) => {
      sessionState.update(() => ({ mode: null, subject: null }));
      unmountRemoteSubject(subject.id);
      bus.emit('session:ended', { subject });
    },
    onFailed: () => bus.emit('session:failed', { reason: 'joinDialog.answerTimeout' }),
    onJoined: (subject) => {
      sessionState.update(() => ({ mode: 'guest', subject }));
      bus.emit('session:joined', { subject });
    },
    onRejected: (message) => emitNotice('toasts.sessionActionRejected', 'warning', { values: { message } }),
    rtc: options.rtc,
  });
  guestNode = guest;
  setSessionCommandSender((subjectId, command, args) => {
    guest.sendCommand(subjectId, command, args);
  });
  return answerText;
}

function stopHost(): void {
  for (const off of detachHost.splice(0)) off();
  // dispose() fires the host's onEnded, which resets sessionState and sessionPeers.
  hostNode?.dispose();
  hostNode = null;
}

function stopGuest(): void {
  guestNode?.dispose();
  guestNode = null;
  setSessionCommandSender(null);
}

/** Leaves the current session: ends hosting and/or drops the guest mirror. */
export function endSession(): void {
  stopHost();
  stopGuest();
}
