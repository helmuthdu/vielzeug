import type { CookieConsentRecord } from '@vielzeug/refine/cookie-banner';
import { signal } from '@vielzeug/ripple';

/**
 * Cookie/consent state for the one third-party embed the app offers: the YouTube
 * music player. The record is persisted in localStorage: it must be readable
 * synchronously at startup, before the vault (IndexedDB) has opened, because the
 * consent gate decides whether the YouTube script may load at all.
 *
 * `decided` distinguishes "never asked" from "asked and rejected": the banner
 * opens on startup only while nobody has decided yet.
 */

export type MusicConsent = CookieConsentRecord & { decided: boolean };

const CONSENT_KEY = 'primal:consent';

function readStoredConsent(): MusicConsent {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { decided: false, music: false };
    const parsed = JSON.parse(raw) as Partial<MusicConsent>;
    return { decided: parsed.decided === true, music: parsed.music === true };
  } catch {
    return { decided: false, music: false };
  }
}

export const consent = signal<MusicConsent>(readStoredConsent());

/** True once the user may load YouTube embeds: the gate every YouTube call site checks. */
export const musicAllowed = (): boolean => consent.peek().decided && consent.peek().music;

/** Banner visibility; opens on startup while no decision has been recorded. */
export const consentBannerOpen = signal<boolean>(!consent.peek().decided);

/** Records a decision from the banner's `decide` event and closes the banner. */
export function saveConsent(record: CookieConsentRecord): void {
  const next: MusicConsent = { decided: true, music: record.music === true };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
  } catch {
    /* localStorage unavailable: the decision still applies for this session */
  }
  consent.update(() => next);
  consentBannerOpen.update(() => false);
}

/** Opens the banner so the user can grant or revise the music-embed consent. */
export function requestMusicConsent(): void {
  consentBannerOpen.update(() => true);
}
