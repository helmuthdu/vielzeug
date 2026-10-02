import { signal } from '@vielzeug/ripple';

/**
 * The narration layer's state: the table's chosen reading pace, each journal
 * entry's reading position (so the chronicler resumes where the table left
 * off), and the one entry currently being read: the app speaks with one
 * voice, and every surface that carries it follows it here.
 */

const POSITION_KEY = 'primal:speech-position';
const RATE_KEY = 'primal:speech-rate';

/** A stable key per entry text: a changed entry is a new key, so a saved
 * position can never point past a re-edited text's end. */
function entryKey(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index++) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function readPositions(): Record<string, number> {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** The sentence index the entry's reading continues from, when one was saved. */
export function loadNarrationPosition(text: string): number | undefined {
  const position = readPositions()[entryKey(text)];
  return typeof position === 'number' && position >= 0 ? position : undefined;
}

/** Remembers the sentence being read: a closed or navigated-past band picks up there. */
export function saveNarrationPosition(text: string, sentence: number): void {
  try {
    const positions = readPositions();
    positions[entryKey(text)] = sentence;
    localStorage.setItem(POSITION_KEY, JSON.stringify(positions));
  } catch {
    /* storage unavailable: resume is a nicety, not a guarantee */
  }
}

/** A finished or explicitly stopped entry reads from the beginning next time. */
export function clearNarrationPosition(text: string): void {
  try {
    const positions = readPositions();
    delete positions[entryKey(text)];
    localStorage.setItem(POSITION_KEY, JSON.stringify(positions));
  } catch {
    /* nothing to clear when storage is unavailable */
  }
}

function readRate(): number {
  try {
    const rate = Number(localStorage.getItem(RATE_KEY));
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
  } catch {
    return 1;
  }
}

/** The table's chosen reading pace: one pace for every journal band. */
export const narrationRate = signal<number>(readRate());

export function setNarrationRate(rate: number): void {
  if (!(rate > 0)) return;
  narrationRate.update(() => rate);
  try {
    localStorage.setItem(RATE_KEY, String(rate));
  } catch {
    /* session-only pace when storage is unavailable */
  }
}

/** The entry currently being read: what the app's foot shows, and what any
 *  other voice: music, another band: must yield to. */
export type ActiveNarration = { paused: boolean; source: string; stop: (preservePosition?: boolean) => void };

export const narration = signal<ActiveNarration | null>(null);

/** Claims the app's voice; the reader before it, if any, stops. */
export function startNarration(active: ActiveNarration): void {
  stopNarration(true);
  narration.update(() => active);
}

/** Stops the reading and releases the voice; only a new reader handoff preserves its position. */
export function stopNarration(preservePosition = false): void {
  const active = narration.peek();
  if (!active) return;
  narration.update(() => null);
  active.stop(preservePosition);
}

/** Releases the voice without stopping it: the reader itself already ended. */
export function releaseNarration(): void {
  narration.update(() => null);
}

/** Mirrors the reader's pause state onto the voice: the foot chip's bars hold still. */
export function setNarrationPaused(stop: ActiveNarration['stop'], paused: boolean): void {
  narration.update((active) => (active?.stop === stop ? { ...active, paused } : active));
}
