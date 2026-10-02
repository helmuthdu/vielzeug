import { createBus } from '@vielzeug/herald';
import type { MeshPeer } from '@vielzeug/mesh';
import { type Signal, signal } from '@vielzeug/ripple';
import type { GameMode, SubjectRef } from '../domain/types';
import type { MessageKey, PluralMessageKey } from './i18n';

export type { MessageKey, PluralMessageKey } from './i18n';
export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

/** A toast button. The label is a catalog key so guests translate it in their own locale. */
export interface NotifyAction {
  key: MessageKey;
  onClick: () => void;
}

/**
 * A user-facing notice carried as a catalog key plus its values, never as finished prose:
 * the store and domain stay language-free and each client translates at the edge.
 */
export interface Notice {
  actions?: NotifyAction[];
  /** Present for plural keys; selects the CLDR category. */
  count?: number;
  key: MessageKey | PluralMessageKey;
  values?: Record<string, unknown>;
  variant: NotificationVariant;
}

/** What a shared table session is anchored to: one campaign, expedition, ascent or Winds
 *  series — the domain's own subject reference, under the session layer's name. */
export type SessionSubject = SubjectRef;

export type SessionMode = 'guest' | 'host';

/** The live mode with its subject, or no session at all: the two cannot disagree. */
export type SessionState = { mode: SessionMode; subject: SessionSubject } | { mode: null; subject: null };

export interface AppEvents {
  notify: Notice;
  'session:ended': { subject: SessionSubject };
  /** Catalog key, per the Notice contract: each client translates at its own edge. */
  'session:failed': { reason: MessageKey };
  'session:joined': { subject: SessionSubject };
  /** A subject was deleted (or its mirror unmounted). */
  'subject:removed': { id: string; kind: GameMode };
  /** A subject row changed on disk or in the mirrors; `reason` is the commit description. */
  'subject:updated': { id: string; kind: GameMode; reason: string };
}

/** Typed application bus: domain-level happenings that the UI, logger and notifier react to. */
export const bus = createBus<AppEvents>();

/**
 * One session per tab, mirrored here so the navbar and any view can read it without pulling the
 * peer-to-peer plumbing: the session module owns the transitions and updates these.
 */
export const sessionState: Signal<SessionState> = signal<SessionState>({ mode: null, subject: null });

/** The connected peers of a hosted session; empty for guests. */
export const sessionPeers: Signal<MeshPeer[]> = signal<MeshPeer[]>([]);

/** Whether the global session dialog is open: set by the navbar icon, the menu card and join links. */
export const sessionDialogOpen: Signal<boolean> = signal(false);

/** A saved subject requested by its management view for the host dialog to share. */
export const pendingHostSubject: Signal<SessionSubject | null> = signal<SessionSubject | null>(null);

/** Invitation carried by a `/join/:code` link: it opens the session dialog on the join flow,
 *  which consumes the code. Lives here, not in the session module, so the boot path never
 *  pulls the peer-to-peer plumbing for it. */
export const pendingJoinCode: Signal<string | null> = signal<string | null>(null);

export const notify = (
  key: MessageKey | PluralMessageKey,
  variant: NotificationVariant = 'info',
  options: { actions?: NotifyAction[]; count?: number; values?: Record<string, unknown> } = {},
): void => {
  bus.emit('notify', { ...options, key, variant });
};
