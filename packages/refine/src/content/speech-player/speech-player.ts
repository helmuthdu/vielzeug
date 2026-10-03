import { bind, define, getHost, html, onCleanup, prop, useEmit } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { srOnlyMixin } from '../../styles';

import componentStyles from './speech-player.css?inline';

export { ICON_TAG } from '../icon/icon';

/** The player's reflected state: `unsupported` when the Web Speech API is missing. */
export type SpeechPlayerState = 'idle' | 'playing' | 'paused' | 'unsupported';

/** The rate steps the speed control cycles through: normal, slow, fast. */
export const SPEECH_RATES = [1, 0.85, 1.15] as const;
export type SpeechRate = (typeof SPEECH_RATES)[number];

/** Every user-facing string the component renders or announces. Override the `labels`
 *  property to localize; English is the default. */
export type OreSpeechPlayerLabels = {
  /** Announced when the engine fails mid-read. */
  error: string;
  /** The toggle's accessible name while playing. */
  pause: string;
  /** Announced when reading is paused. */
  paused: string;
  /** The toggle's accessible name while idle. */
  read: string;
  /** The toggle's accessible name while paused. */
  resume: string;
  /** Announced when reading resumes. */
  resumed: string;
  /** Announced when reading starts. */
  started: string;
  /** The speed control's accessible-name stem; the current step's name follows it. */
  speed: string;
  /** The fast speed step's name. */
  speedFast: string;
  /** The normal speed step's name. */
  speedNormal: string;
  /** The slow speed step's name. */
  speedSlow: string;
  /** The stop control's accessible name. */
  stop: string;
  /** Announced when reading stops before finishing. */
  stopped: string;
  /** Announced when reading finishes on its own. */
  finished: string;
  /** The toggle's accessible name when speech synthesis is unavailable. */
  unsupported: string;
};

const DEFAULT_LABELS: OreSpeechPlayerLabels = {
  error: 'Reading was interrupted.',
  finished: 'Reading finished.',
  pause: 'Pause reading',
  paused: 'Reading paused.',
  read: 'Read aloud',
  resume: 'Resume reading',
  resumed: 'Reading resumed.',
  speed: 'Reading speed',
  speedFast: 'fast',
  speedNormal: 'normal',
  speedSlow: 'slow',
  started: 'Reading aloud.',
  stop: 'Stop reading',
  stopped: 'Reading stopped.',
  unsupported: 'Text-to-speech is unavailable',
};

/** Speech player component properties */
export type OreSpeechPlayerProps = {
  /** Labels for the controls and announcements: override to localize. */
  labels?: Partial<OreSpeechPlayerLabels>;
  /** Playback rate: bind with `rate-change` to persist the listener's choice; unbound,
   *  the speed control cycles on its own. Values outside `SPEECH_RATES` snap into the
   *  cycle at the control's first use. */
  rate?: number;
  /** The sentence index playback begins from: bind a persisted position so "resume"
   *  survives stops, collapses, and page loads. */
  'resume-at'?: number;
  /** The text to read aloud. */
  text?: string;
};

/** Speech player component events */
export type OreSpeechPlayerEvents = {
  /** Reading finished on its own. */
  end: undefined;
  /** The engine failed mid-read: reading stopped, but not by the listener. */
  error: undefined;
  /** Reading started: from the control or a `play()` call. */
  play: undefined;
  /** A sentence began: carry `sentence` of `total` to the surfaces that follow the voice. */
  progress: { sentence: number; total: number };
  /** The speed control moved to a new step. */
  'rate-change': { rate: number };
  /** Reading stopped before finishing: from the control or a `stop()` call. */
  stop: undefined;
};

/** Element interface exposing the imperative API for `ore-speech-player`. */
export interface SpeechPlayerElement extends HTMLElement, OreSpeechPlayerProps {
  /** Pauses the current reading. */
  pause(): void;
  /** Starts reading: from `resume-at` when bound, else from the beginning.
   *  Any player already reading stops first. */
  play(): void;
  /** Stops reading and cancels pending speech. */
  stop(): void;
}

/** Chrome cuts a single utterance off after roughly fifteen seconds of speech; sentence
 *  pieces under this length stay safely inside that window at any of the rate steps. */
const UTTERANCE_LIMIT = 220;

/** The entry's sentences: prose ends . ! or ?, closing quotes belong to the sentence
 *  they end, and an unterminated tail is still a sentence. Consumers that highlight what
 *  is being read build their display from this same list, so `progress` sentence indexes
 *  map onto their own. */
export function speechSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const sentences: string[] = normalized.match(/[^.!?]+[.!?]+["'”’»]*/g) ?? [];
  const consumed = sentences.join('').length;
  if (consumed < normalized.length) sentences.push(normalized.slice(consumed));
  return sentences.flatMap((sentence) => {
    const trimmed = sentence.trim();
    return trimmed ? [trimmed] : [];
  });
}

/** Breaks a sentence longer than `limit` at word boundaries (falling back to a hard cut). */
function hardSplit(sentence: string, limit: number): string[] {
  const pieces: string[] = [];
  let rest = sentence;
  while (rest.length > limit) {
    const cut = rest.lastIndexOf(' ', limit);
    const at = cut > 0 ? cut : limit;
    pieces.push(rest.slice(0, at));
    rest = rest.slice(at).trimStart();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

/** One spoken unit: a sentence, or a piece of one that alone exceeds the engine limit :
 *  pieces keep their sentence's index, so `progress` never skips a highlight. */
type SpeechPiece = { sentence: number; text: string };

function piecesOf(sentences: string[], limit = UTTERANCE_LIMIT): SpeechPiece[] {
  return sentences.flatMap((sentence, index) =>
    (sentence.length > limit ? hardSplit(sentence, limit) : [sentence]).map((text) => ({
      sentence: index,
      text,
    })),
  );
}

/**
 * A text-to-speech player control: reads its `text` aloud through the Web Speech API.
 *
 * Renders a labeled play/pause toggle (the label folds away once engaged), a stop
 * control beside it that appears while reading, and a speed control cycling
 * normal/slow/fast. The text is spoken sentence by sentence (long sentences split into pieces under the
 * engine's truncation window), the `state` attribute reflects playback, a
 * `role="status"` live region announces transitions, and `progress` events name the
 * sentence being read so a consumer can highlight it. Only one player speaks at a
 * time: starting one stops any other. `resume-at` names the sentence to begin from,
 * so a persisted position makes resume mean it.
 *
 * @element ore-speech-player
 *
 * @attr {string} text - The text to read aloud (also settable as a JavaScript property)
 * @attr {string} lang - BCP-47 tag of `text`'s language, e.g. `en` or `de-DE`
 * @attr {string} state - Reflected playback state: 'idle' | 'playing' | 'paused' | 'unsupported'
 * @attr {number} rate - Playback rate; the speed control cycles 1 → 0.85 → 1.15
 * @attr {number} resume-at - The sentence index playback begins from
 *
 * @fires play - Reading started. No detail.
 * @fires progress - A sentence began. detail: { sentence, total }
 * @fires stop - Reading stopped before finishing. No detail.
 * @fires end - Reading finished on its own. No detail.
 * @fires error - The engine failed mid-read. No detail.
 * @fires rate-change - The speed control moved to a new step. detail: { rate }
 *
 * @cssprop --speech-player-gap - Gap between the controls
 * @cssprop --speech-player-control-size - Each control's hit-area size (the toggle grows with its label)
 * @cssprop --speech-player-icon-color - Control icon color at rest
 * @cssprop --speech-player-active-color - Toggle color while reading (playing or paused)
 * @cssprop --speech-player-hover-bg - Control background on hover
 *
 * @part player - Outer control group
 * @part play - The play/pause toggle button
 * @part rate - The speed control
 * @part stop - The stop button (hidden while idle)
 *
 * @example
 * ```html
 * <ore-speech-player text="The valley sleeps under ash."></ore-speech-player>
 *
 * <ore-speech-player lang="de" text="Das Tal schläft unter Asche."></ore-speech-player>
 * ```
 */
export const SPEECH_PLAYER_TAG = 'ore-speech-player' as const;

/** Stops whichever player is currently reading: speechSynthesis is one global voice, so a
 *  new reader cancels the engine and the old player needs to settle to idle. */
let stopActivePlayer: (() => void) | null = null;

define<OreSpeechPlayerProps>(SPEECH_PLAYER_TAG, {
  props: {
    labels: prop.data<Partial<OreSpeechPlayerLabels>>({}),
    rate: prop.number(1),
    'resume-at': prop.number(),
    text: prop.string(''),
  },

  setup(props) {
    const host = getHost() as SpeechPlayerElement;
    const emit = useEmit<OreSpeechPlayerEvents>();

    const supported = typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
    const state = signal<SpeechPlayerState>(supported ? 'idle' : 'unsupported');
    const announcement = signal('');

    // The reading stream is sentence-addressed: pieces carry their sentence's index, so
    // progress and highlighting never drift apart.
    const sentences = computed(() => speechSentences(props.text.value ?? ''));
    const pieces = computed(() => piecesOf(sentences.value));
    const hasText = computed(() => (props.text.value ?? '').trim().length > 0);
    const label = (key: keyof OreSpeechPlayerLabels): string => props.labels.value?.[key] ?? DEFAULT_LABELS[key];
    const toggleLabel = computed(() => {
      if (state.value === 'unsupported') return label('unsupported');
      if (state.value === 'playing') return label('pause');
      if (state.value === 'paused') return label('resume');
      return label('read');
    });

    // The rate is the consumer's to persist: bind `rate` with `rate-change` and every
    // instance follows the listener's choice; unbound, the control cycles internally.
    const rate = signal<number>(props.rate.value ?? 1);
    watch(props.rate, (value) => {
      if (value !== undefined) rate.value = value;
    });
    const speedName = (value: number): string => {
      if (value === 1) return label('speedNormal');
      if (value === 0.85) return label('speedSlow');
      if (value === 1.15) return label('speedFast');
      return `${value}×`;
    };
    const speedLabel = computed(() => `${label('speed')}: ${speedName(rate.value)}`);

    // Reflect playback so CSS can react to it; the aria contract lives on the controls.
    bind({ attr: { state } });

    const labelOf = (key: keyof OreSpeechPlayerLabels): void => {
      announcement.value = label(key);
    };

    /** Utterance callbacks capture the generation they belong to; a stop or a later play
     *  bumps it, so stale events from a canceled utterance cannot chain or settle. */
    let generation = 0;
    /** Bumped by any engine callback on the live utterance: liveness evidence for the
     *  resume watchdog. */
    let enginePulse = 0;
    let current = 0;
    let disposed = false;

    const speakPiece = (index: number): void => {
      current = index;
      const piece = pieces.value[index]!;
      const utterance = new SpeechSynthesisUtterance(piece.text);
      utterance.rate = rate.value;
      // The native `lang` attribute names the text's language: the standard HTML
      // semantic, and hints voice selection when no explicit voice matches yet.
      const lang = host.getAttribute('lang');
      if (lang) {
        utterance.lang = lang;
        const voice = window.speechSynthesis
          .getVoices()
          .find((candidate) => candidate.lang.toLowerCase().startsWith(lang.toLowerCase()));
        if (voice) utterance.voice = voice;
      }
      const token = generation;
      const alive = (): void => {
        if (token === generation) enginePulse += 1;
      };
      utterance.onstart = alive;
      utterance.onboundary = alive;
      utterance.onend = () => {
        alive();
        if (token !== generation) return;
        if (index + 1 >= pieces.value.length) {
          releaseActive();
          state.value = 'idle';
          labelOf('finished');
          emit('end');
        } else {
          speakPiece(index + 1);
        }
      };
      utterance.onerror = () => {
        alive();
        if (token !== generation) return;
        releaseActive();
        state.value = 'idle';
        labelOf('error');
        emit('error');
      };
      emit('progress', { sentence: piece.sentence, total: sentences.value.length });
      window.speechSynthesis.speak(utterance);
    };

    const releaseActive = (): void => {
      if (stopActivePlayer === stop) stopActivePlayer = null;
    };

    /** The first piece of the sentence to begin from: clamped into the text. */
    const pieceIndexFor = (sentence: number | undefined): number => {
      const total = sentences.value.length;
      if (sentence === undefined || total === 0) return 0;
      const begin = Math.min(Math.max(sentence, 0), total - 1);
      const index = pieces.value.findIndex((piece) => piece.sentence >= begin);
      return index === -1 ? 0 : index;
    };

    const start = (): void => {
      if (state.value !== 'idle' || !hasText.value) return;
      stopActivePlayer?.();
      window.speechSynthesis.cancel();
      generation += 1;
      stopActivePlayer = stop;
      state.value = 'playing';
      labelOf('started');
      emit('play');
      speakPiece(pieceIndexFor(props['resume-at'].value));
    };

    let pausedAt = 0;

    const pause = (): void => {
      if (state.value !== 'playing') return;
      window.speechSynthesis.pause();
      state.value = 'paused';
      pausedAt = performance.now();
      labelOf('paused');
    };

    const resume = (): void => {
      if (state.value !== 'paused') return;
      window.speechSynthesis.resume();
      state.value = 'playing';
      labelOf('resumed');
      // Some Chromium builds resume a long-held pause into silence: no error, no
      // event, the playing state a lie. Within ten seconds the engine is trusted;
      // beyond it, demand a pulse within a second or restart the current sentence :
      // a fresh utterance always speaks. Boundary-less engines only pay this on long holds.
      if (performance.now() - pausedAt < 10_000) return;
      const pulse = enginePulse;
      window.setTimeout(() => {
        if (disposed || state.value !== 'playing' || enginePulse !== pulse) return;
        generation += 1;
        window.speechSynthesis.cancel();
        speakPiece(current);
      }, 1000);
    };

    function stop(): void {
      if (state.value === 'idle' || state.value === 'unsupported') return;
      generation += 1;
      releaseActive();
      window.speechSynthesis.cancel();
      state.value = 'idle';
      labelOf('stopped');
      emit('stop');
    }

    /** One control, three meanings by state: play, pause, resume. */
    const toggle = (): void => {
      if (state.value === 'playing') pause();
      else if (state.value === 'paused') resume();
      else start();
    };

    const cycleRate = (): void => {
      const index = SPEECH_RATES.indexOf(rate.value as SpeechRate);
      rate.value = SPEECH_RATES[(index + 1) % SPEECH_RATES.length] ?? 1;
      announcement.value = speedLabel.value;
      emit('rate-change', { rate: rate.value });
      // A rate change while reading applies at once: the current sentence restarts at
      // the new pace. Paused or idle readings pick it up with the next sentence.
      if (state.value === 'playing') {
        generation += 1;
        window.speechSynthesis.cancel();
        speakPiece(current);
      }
    };

    host.play = start;
    host.pause = pause;
    host.stop = stop;

    onCleanup(() => {
      disposed = true;
      generation += 1;
      releaseActive();
      // The engine itself may already be gone in a tearing-down context.
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    });

    return html`
      <div class="player" part="player">
        <button
          class="control control--toggle"
          part="play"
          type="button"
          ?disabled="${() => state.value === 'unsupported' || !hasText.value}"
          aria-label="${toggleLabel}"
          @click=${toggle}
        >
          ${() =>
            state.value === 'playing'
              ? html`<ore-icon name="pause" size="16" aria-hidden="true"></ore-icon>`
              : html`<ore-icon name="play" size="16" aria-hidden="true"></ore-icon>`}
          <span class="toggle-label" ?hidden="${() => state.value === 'playing' || state.value === 'paused'}">${() => label('read')}</span>
        </button>
        <button
          class="control"
          part="stop"
          type="button"
          ?hidden="${() => state.value === 'idle' || state.value === 'unsupported'}"
          aria-label="${() => label('stop')}"
          @click=${stop}
        >
          <ore-icon name="square" size="16" aria-hidden="true"></ore-icon>
        </button>
        <button
          class="control control--rate"
          part="rate"
          type="button"
          aria-label="${speedLabel}"
          @click=${cycleRate}
        >
          <ore-icon name="gauge" size="16" aria-hidden="true"></ore-icon>
          <span class="rate-text">${() => `${rate.value}×`}</span>
        </button>
      </div>
      <div class="sr-only" role="status">${announcement}</div>
    `;
  },

  styles: [srOnlyMixin, componentStyles],
});
