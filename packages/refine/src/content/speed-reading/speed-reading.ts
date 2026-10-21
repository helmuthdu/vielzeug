import { bind, define, getHost, html, onCleanup, onMounted, prop, ref, useEmit } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { warn } from '../../_dev';
import type { OverlayOpenChangeDetail } from '../../core';
import { srOnlyMixin } from '../../styles';
import { type ReadingWord, readingWords } from './_text';
import styles from './speed-reading.css?inline';

export { ACCORDION_ITEM_TAG } from '../../disclosure/accordion-item/accordion-item';
export { BUTTON_TAG } from '../../inputs/button/button';
export { SELECT_TAG } from '../../inputs/select/select';
export { SLIDER_TAG } from '../../inputs/slider/slider';
export { POPOVER_TAG } from '../../overlay/popover/popover';
export { TOOLTIP_TAG } from '../../overlay/tooltip/tooltip';
export { ICON_TAG } from '../icon/icon';

export type SpeedReadingState = 'idle' | 'playing' | 'paused' | 'ended';

export type OreSpeedReadingLabels = {
  continue: string;
  empty: string;
  enterFullscreen: string;
  exitFullscreen: string;
  finish: string;
  finished: string;
  fullscreenUnsupported: string;
  fullText: string;
  guidance: string;
  hidden: string;
  help: string;
  next: string;
  overflow: string;
  paceHelp: string;
  pause: string;
  paused: string;
  play: string;
  previous: string;
  readAgain: string;
  restart: string;
  resume: string;
  resumeHere: string;
  sentence: string;
  shortcuts: string;
  shortcutsHeading: string;
  started: string;
  tapHint: string;
  viewport: string;
  words: string;
  wpm: string;
  wpmShort: string;
  wpmHelp: string;
};

export type OreSpeedReadingProps = {
  /** Localized control names and status messages. */
  labels?: Partial<OreSpeedReadingLabels>;
  /** Plain text; never interpreted as markup. */
  text?: string;
  /** Zero-based position; finite values are rounded down and clamped. */
  'word-index'?: number;
  /** Base words per minute, clamped to 100–600; defaults to 250. */
  wpm?: number;
};

export type OreSpeedReadingEvents = {
  end: undefined;
  pause: undefined;
  play: undefined;
  /** Source offsets are UTF-16 indexes, with an exclusive end. */
  progress: { end: number; index: number; start: number; total: number };
  'wpm-change': { wpm: number };
};

export interface SpeedReadingElement extends HTMLElement, OreSpeedReadingProps {
  enterFullscreen(): void;
  exitFullscreen(): void;
  pause(): void;
  play(): void;
  restart(): void;
  seek(index: number): void;
}

const LABELS: OreSpeedReadingLabels = {
  continue: 'Continue after this word',
  empty: 'Add text to begin.',
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  finish: 'Finish reading',
  finished: 'Reading finished.',
  fullscreenUnsupported: 'Fullscreen is unavailable in this browser.',
  fullText: 'Read full text',
  guidance: 'One word at a time. Start at a comfortable pace.',
  help: 'Reading pace and keyboard help',
  hidden: 'Paused because the tab was hidden.',
  next: 'Next word',
  overflow: 'This word needs more space. Read it in the full text below.',
  paceHelp: 'Punctuation adds pauses. Lower the pace when needed.',
  pause: 'Pause',
  paused: 'Reading paused.',
  play: 'Start reading',
  previous: 'Previous word',
  readAgain: 'Read again',
  restart: 'Restart',
  resume: 'Resume',
  resumeHere: 'Resume from here',
  sentence: 'Start at sentence',
  shortcuts:
    'Focused reading display: Space starts or pauses; Left and Right Arrow step one word. Tap the sides to step, the center to start or pause.',
  shortcutsHeading: 'Keyboard shortcuts',
  started: 'Reading started.',
  tapHint: 'Tap the sides to step one word; tap the center to start or pause.',
  viewport: 'Paced reading. Space or a center tap plays or pauses; arrow keys or side taps step.',
  words: 'words',
  wpm: 'Words per minute',
  wpmHelp: 'Words per minute sets the base pace, from 100 to 600. Start at a comfortable pace.',
  wpmShort: 'WPM',
};

/**
 * Optional, user-paced RSVP reading with a fixed focal letter and full-text alternative.
 * No autoplay, network access, persistence, or speech synchronization.
 *
 * @element ore-speed-reading
 * @attr {string} text - Plain text to read
 * @attr {number} wpm - Base words per minute, 100–600 (default 250)
 * @attr {number} word-index - Zero-based word position (default 0)
 * @attr {string} state - Read-only playback state: idle | playing | paused | ended
 * @attr {boolean} fullscreen - Read-only; present while the reader fills the screen
 * @fires play - Playback started
 * @fires pause - Playback paused
 * @fires end - Reading finished after the final dwell or explicit overflow completion
 * @fires progress - Displayed token changed; detail: { index, total, start, end }
 * @fires wpm-change - User changed speed; detail: { wpm }
 * @cssprop --speed-reading-font-size - Maximum display type size (default var(--text-3xl))
 * @cssprop --speed-reading-fullscreen-font-size - Maximum fullscreen display type size (default min(10vw, var(--size-96)))
 * @cssprop --speed-reading-min-font-size - Minimum passage-fitted type size (default var(--text-base))
 * @cssprop --speed-reading-height - Minimum display height (default var(--size-32))
 * @cssprop --speed-reading-gap - Space between reader sections (default var(--size-4))
 * @cssprop --speed-reading-focal-color - Focal letter color (default var(--color-primary))
 * @part viewport - Focusable reader viewport
 * @part word - Visual word, hidden from assistive technology
 * @part focal - Stationary focal grapheme
 * @part controls - Playback controls
 * @part status - Visible playback status and position
 * @part full-text - Ordinary selectable text
 * @example
 * ```html
 * <ore-speed-reading lang="en" text="Read at your own pace. Pause for context."></ore-speed-reading>
 * ```
 */
export const SPEED_READING_TAG = 'ore-speed-reading' as const;

define<OreSpeedReadingProps>(SPEED_READING_TAG, {
  props: {
    labels: prop.data<Partial<OreSpeedReadingLabels>>({}),
    text: prop.string(''),
    'word-index': prop.number(0),
    wpm: prop.number(250),
  },
  setup(props) {
    const host = getHost() as SpeedReadingElement;
    const emit = useEmit<OreSpeedReadingEvents>();
    const state = signal<SpeedReadingState>('idle');
    const index = signal(0);
    const wpm = signal(250);
    const words = signal<ReadingWord[]>([]);
    const expanded = signal(false);
    const announcement = signal('');
    const tooWide = signal(false);
    const pauseReason = signal('');
    const fullscreen = signal(false);
    const sentences = signal<Array<{ end: number; index: number; start: number; text: string }>>([]);
    const viewport = ref<HTMLElement>();
    const wordElement = ref<HTMLElement>();
    const minimum = ref<HTMLElement>();
    const measure = ref<HTMLElement>();
    const fullText = ref<HTMLElement>();
    const toggleButton = ref<HTMLElement>();
    const helpButton = ref<HTMLElement>();
    const helpContent = ref<HTMLElement>();
    const fullscreenButton = ref<HTMLElement>();
    const current = computed(() => words.value[index.value]);
    const overflow = computed(() => tooWide.value && state.value !== 'ended');
    const label = (key: keyof OreSpeedReadingLabels): string => props.labels.value?.[key] ?? LABELS[key];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;
    let generation = 0;
    let disposed = false;
    let fittedSize: number | undefined;
    let fittedBase: number | undefined;
    const sentenceIndex = computed(() => {
      const start = current.value?.start ?? 0;
      return Math.max(
        0,
        sentences.value.findIndex((sentence) => start < sentence.end),
      );
    });
    const sentenceOption = (sentence: { text: string }, position: number): string => {
      const preview = sentence.text.length > 60 ? `${sentence.text.slice(0, 59).trimEnd()}…` : sentence.text;
      return `${position + 1}. ${preview}`;
    };
    const toggleLabel = computed(() =>
      label(
        state.value === 'playing'
          ? 'pause'
          : state.value === 'ended'
            ? 'readAgain'
            : state.value === 'paused'
              ? 'resume'
              : 'play',
      ),
    );
    const visibleStatus = computed(() =>
      !words.value.length
        ? label('empty')
        : overflow.value
          ? label('overflow')
          : state.value === 'ended'
            ? label('finished')
            : state.value === 'paused'
              ? pauseReason.value || label('paused')
              : state.value === 'playing'
                ? label('started')
                : label('guidance'),
    );

    bind({ attr: { fullscreen, state } });

    const cancel = (): void => {
      generation += 1;
      clearTimeout(timer);
      timer = undefined;
    };
    const pause = (): void => {
      cancel();
      if (state.value !== 'playing') return;
      state.value = 'paused';
      pauseReason.value = '';
      announcement.value = label('paused');
      emit('pause');
    };
    const reflectIndex = (): void => {
      if (host.getAttribute('word-index') !== String(index.value)) {
        host.setAttribute('word-index', String(index.value));
      }
    };
    const publish = (): void => {
      reflectIndex();
      const word = current.value;
      if (word) emit('progress', { end: word.end, index: index.value, start: word.start, total: words.value.length });
    };
    const setPosition = (position: number): void => {
      if (index.value === position) return;
      index.value = position;
      publish();
    };
    const seek = (position: number): void => {
      if (!Number.isFinite(position)) {
        warn('ore-speed-reading: word-index must be a finite number.');
        return;
      }
      pause();
      if (words.value.length) state.value = 'paused';
      pauseReason.value = '';
      setPosition(Math.max(0, Math.min(Math.floor(position), Math.max(0, words.value.length - 1))));
      reflectIndex();
      requestFit();
    };
    const restart = (): void => {
      pause();
      state.value = 'idle';
      setPosition(0);
      requestFit();
    };
    const finish = (): void => {
      cancel();
      state.value = 'ended';
      announcement.value = label('finished');
      emit('end');
    };
    const continueAfterWord = (): void => {
      if (!overflow.value) return;
      if (index.value + 1 >= words.value.length) finish();
      else seek(index.value + 1);
      viewport.value?.focus();
    };
    const scrollContext = (): void => {
      const container = fullText.value;
      const mark = container?.querySelector('mark');
      if (!expanded.value || !container || !mark) return;
      const bounds = container.getBoundingClientRect();
      const position = mark.getBoundingClientRect();
      container.scrollTop += position.top - bounds.top - (container.clientHeight - position.height) / 2;
    };
    const requiredWidth = (element: HTMLElement, word: ReadingWord): number => {
      const parts = ['prefix', 'focal', 'suffix'].map((name) => element.querySelector<HTMLElement>(`.${name}`)!);
      for (const [i, text] of [word.prefix, word.focal, word.suffix].entries()) parts[i]!.textContent = text;
      const widths = parts.map((node) => {
        const range = host.ownerDocument.createRange();
        range.selectNodeContents(node);
        return range.getBoundingClientRect().width;
      });
      return word.focal ? 2 * (Math.max(widths[0]!, widths[2]!) + widths[1]! / 2) : widths[2]!;
    };
    const fitWord = (): boolean => {
      const display = viewport.value;
      const element = wordElement.value;
      const probe = measure.value;
      if (!display || !element || !minimum.value || !probe || display.clientWidth === 0) return true;
      if (!current.value) return true;
      probe.style.removeProperty('font-size');
      const base = Number.parseFloat(getComputedStyle(probe).fontSize);
      const floor = Number.parseFloat(getComputedStyle(minimum.value).fontSize);
      const available = display.clientWidth;
      if (fittedSize === undefined || fittedBase !== base) {
        // Bound layout measurement; exceptional tokens use the explicit context fallback.
        const sample = words.value
          .filter((word) => Array.from(word.text).length <= 20)
          .sort((a, b) => b.text.length - a.text.length)
          .slice(0, 32);
        const required = Math.max(1, ...sample.map((word) => requiredWidth(probe, word)));
        fittedSize = Math.max(floor, Math.min(base, (base * available) / required));
        fittedBase = base;
      }
      // Pixel sizes are measured font geometry, not design-token replacements.
      element.style.fontSize = `${fittedSize}px`;
      probe.style.fontSize = `${fittedSize}px`;
      tooWide.value = requiredWidth(probe, current.value) > available + 1;
      if (overflow.value) {
        pause();
        expanded.value = true;
        announcement.value = label('overflow');
        return false;
      }
      return true;
    };
    const requestFit = (invalidate = false): void => {
      if (invalidate) fittedSize = undefined;
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = undefined;
        if (!disposed) {
          fitWord();
          scrollContext();
        }
      });
    };
    const arm = (): void => {
      cancel();
      if (disposed || state.value !== 'playing' || !current.value) return;
      const token = generation;
      const deadline = performance.now() + (60_000 / wpm.value) * current.value.multiplier;
      timer = setTimeout(
        () => {
          if (disposed || token !== generation || state.value !== 'playing') return;
          timer = undefined;
          if (index.value + 1 >= words.value.length) {
            finish();
            return;
          }
          setPosition(index.value + 1);
          // Event listeners may pause, seek or replace the text while handling progress.
          if (token === generation && state.value === 'playing') arm();
        },
        Math.max(0, deadline - performance.now()),
      );
    };
    const play = (): void => {
      if (
        disposed ||
        !host.isConnected ||
        host.ownerDocument.hidden ||
        !words.value.length ||
        state.value === 'playing'
      )
        return;
      if (state.value === 'ended') {
        state.value = 'idle';
        setPosition(0);
      }
      if (!fitWord()) return;
      expanded.value = false;
      state.value = 'playing';
      pauseReason.value = '';
      announcement.value = label('started');
      arm();
      emit('play');
    };
    const toggle = (): void => {
      if (state.value === 'playing') pause();
      else play();
    };
    const supportsFullscreen = (): boolean => typeof host.requestFullscreen === 'function';
    const fullscreenLabel = computed(() => (fullscreen.value ? label('exitFullscreen') : label('enterFullscreen')));
    const enterFullscreen = (): void => {
      if (!supportsFullscreen()) {
        warn('ore-speed-reading: requestFullscreen is unavailable; fullscreen was not entered.');
        return;
      }
      if (host.ownerDocument.fullscreenElement === host) return;
      host.requestFullscreen().catch(() => {
        warn('ore-speed-reading: the browser refused the fullscreen request.');
      });
    };
    const exitFullscreen = (): void => {
      if (host.ownerDocument.fullscreenElement !== host) return;
      host.ownerDocument.exitFullscreen().catch(() => {
        warn('ore-speed-reading: the browser refused to leave fullscreen.');
      });
    };
    const toggleFullscreen = (): void => {
      if (fullscreen.value) exitFullscreen();
      else enterFullscreen();
    };
    let tapOrigin: { x: number; y: number } | undefined;
    const handlePointerDown = (event: PointerEvent): void => {
      tapOrigin = { x: event.clientX, y: event.clientY };
    };
    const handlePointerUp = (event: PointerEvent): void => {
      const origin = tapOrigin;
      tapOrigin = undefined;
      const display = viewport.value;
      if (!origin || !display || event.pointerType === 'mouse' || overflow.value || !words.value.length) return;
      if (Math.abs(event.clientX - origin.x) > 8 || Math.abs(event.clientY - origin.y) > 8) return;
      const bounds = display.getBoundingClientRect();
      const ratio = (event.clientX - bounds.left) / bounds.width;
      const rtl = host.matches(':dir(rtl)');
      const forward = rtl ? ratio < 1 / 3 : ratio > 2 / 3;
      const backward = rtl ? ratio > 2 / 3 : ratio < 1 / 3;
      if (forward) seek(index.value + 1);
      else if (backward) seek(index.value - 1);
      else toggle();
    };
    const normalizeWpm = (value: number | undefined): number => {
      if (value === undefined) return 250;
      if (!Number.isFinite(value)) {
        warn('ore-speed-reading: wpm must be a finite number; using 250.');
        return 250;
      }
      return Math.min(600, Math.max(100, value));
    };
    const handleWpmChange = (event: Event): void => {
      event.stopPropagation();
      const target = event.currentTarget as HTMLElement & { value?: string };
      const next = normalizeWpm(Number(target.value));
      host.wpm = next;
      wpm.value = next;
      emit('wpm-change', { wpm: next });
    };
    const rebuild = (reset: boolean): void => {
      pause();
      state.value = 'idle';
      let locale = host.lang || 'en';
      try {
        Intl.getCanonicalLocales(locale);
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        warn('ore-speed-reading: invalid lang; using en.');
        locale = 'en';
      }
      words.value = readingWords(props.text.value ?? '', locale);
      const source = props.text.value ?? '';
      let wordIndex = 0;
      sentences.value = [...new Intl.Segmenter(locale, { granularity: 'sentence' }).segment(source)].flatMap(
        ({ index: start, segment }) => {
          while (wordIndex < words.value.length && words.value[wordIndex]!.end <= start) wordIndex += 1;
          return wordIndex >= words.value.length || !segment.trim()
            ? []
            : [
                {
                  end: start + segment.length,
                  index: wordIndex,
                  start,
                  text: segment.trim(),
                },
              ];
        },
      );
      const position = reset ? 0 : (props['word-index'].value ?? 0);
      index.value = Number.isFinite(position)
        ? Math.max(0, Math.min(Math.floor(position), Math.max(0, words.value.length - 1)))
        : 0;
      if (!Number.isFinite(position)) warn('ore-speed-reading: word-index must be a finite number; using 0.');
      tooWide.value = false;
      pauseReason.value = '';
      publish();
      requestFit(true);
    };

    watch(props.text, () => rebuild(true));
    watch(
      props.wpm,
      (value) => {
        wpm.value = normalizeWpm(value);
        if (state.value === 'playing') arm();
      },
      { immediate: true },
    );
    watch(props['word-index'], (value) => {
      if (value !== undefined && value !== index.value) seek(value);
    });
    watch(
      computed(() => [index.value, words.value]),
      () => requestFit(),
    );
    watch(expanded, () => requestFit());

    host.play = play;
    host.pause = pause;
    host.restart = restart;
    host.seek = seek;
    host.enterFullscreen = enterFullscreen;
    host.exitFullscreen = exitFullscreen;

    onMounted(() => {
      rebuild(false);
      let width = -1;
      const observer = new ResizeObserver(() => {
        const next = viewport.value?.clientWidth ?? 0;
        if (next !== width) {
          width = next;
          requestFit(true);
        }
      });
      if (viewport.value) observer.observe(viewport.value);
      const attributes = new MutationObserver(() => rebuild(true));
      attributes.observe(host, { attributeFilter: ['lang'] });
      const visibility = (): void => {
        if (host.ownerDocument.hidden && state.value === 'playing') {
          pause();
          pauseReason.value = label('hidden');
          announcement.value = label('hidden');
        }
      };
      const fontsLoaded = (): void => requestFit(true);
      const fullscreenChange = (): void => {
        const active = host.ownerDocument.fullscreenElement === host;
        if (active === fullscreen.value) return;
        fullscreen.value = active;
        // Fullscreen swaps the base type scale without a width change, so the
        // ResizeObserver guard alone would keep the stale fitted size.
        requestFit(true);
        if (active) viewport.value?.focus();
        else fullscreenButton.value?.focus();
      };
      host.ownerDocument.addEventListener('visibilitychange', visibility);
      host.ownerDocument.addEventListener('fullscreenchange', fullscreenChange);
      host.ownerDocument.fonts?.addEventListener('loadingdone', fontsLoaded);
      return () => {
        pause();
        observer.disconnect();
        attributes.disconnect();
        host.ownerDocument.removeEventListener('visibilitychange', visibility);
        host.ownerDocument.removeEventListener('fullscreenchange', fullscreenChange);
        host.ownerDocument.fonts?.removeEventListener('loadingdone', fontsLoaded);
      };
    });
    onCleanup(() => {
      disposed = true;
      cancel();
      if (frame !== undefined) cancelAnimationFrame(frame);
    });

    return html`
      <div class="reader">
        <div
          class="viewport"
          part="viewport"
          ref="${viewport}"
          tabindex="0"
          role="group"
          aria-label=${() => label('viewport')}
          @pointerdown=${handlePointerDown}
          @pointerup=${handlePointerUp}
          @pointercancel=${() => {
            tapOrigin = undefined;
          }}
          @keydown=${(event: KeyboardEvent) => {
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (event.key === ' ') {
              event.preventDefault();
              toggle();
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              seek(index.value + (event.key === 'ArrowLeft' ? -1 : 1));
            }
          }}>
          <span class="minimum" ref="${minimum}" aria-hidden="true"></span>
          <span class="word measure" ref="${measure}" aria-hidden="true">
            <span class="prefix"></span><span class="focal"></span><span class="suffix"></span>
          </span>
          <span
            class="word"
            part="word"
            ref="${wordElement}"
            aria-hidden="true"
            data-centered=${() => (current.value?.focal ? undefined : '')}
            ?hidden=${() => tooWide.value || !current.value}>
            <span class="prefix">${() => current.value?.prefix ?? ''}</span><span class="focal" part="focal">${() => current.value?.focal ?? ''}</span><span class="suffix">${() => current.value?.suffix ?? ''}</span>
          </span>
          <span class="message" ?hidden=${() => Boolean(current.value) && !overflow.value}>
            ${() => (overflow.value ? label('overflow') : label('empty'))}
          </span>
        </div>
        <div class="status" part="status">
          <span>${visibleStatus}</span>
          <span class="position" aria-live="off">
            ${() => (words.value.length ? index.value + 1 : 0)} / ${() => words.value.length} ${() => label('words')}
          </span>
        </div>
        <ore-button
          class="recovery"
          rounded="full"
          variant="flat"
          ?hidden=${() => !overflow.value}
          @click=${continueAfterWord}>
          ${() => label(index.value + 1 >= words.value.length ? 'finish' : 'continue')}
        </ore-button>
        <div class="control-panel">
          <div class="toolbar">
            <div class="controls" part="controls">
              <ore-tooltip content=${() => label('previous')}>
                <ore-button
                  icon-only
                  rounded="full"
                  variant="ghost"
                  aria-label=${() => label('previous')}
                  ?disabled=${() => index.value <= 0}
                  @click=${() => seek(index.value - 1)}>
                  <ore-icon name="chevron-left" aria-hidden="true"></ore-icon>
                </ore-button>
              </ore-tooltip>
              <ore-tooltip content=${toggleLabel}>
                <ore-button
                  class="toggle"
                  ref="${toggleButton}"
                  rounded="full"
                  variant="solid"
                  icon-only
                  color="primary"
                  aria-label=${toggleLabel}
                  ?disabled=${() => !words.value.length || overflow.value}
                  @click=${toggle}>
                  <ore-icon name=${() => (state.value === 'playing' ? 'pause' : 'play')} aria-hidden="true"></ore-icon>
                </ore-button>
              </ore-tooltip>
              <ore-tooltip content=${() => label('next')}>
                <ore-button
                  icon-only
                  rounded="full"
                  variant="ghost"
                  aria-label=${() => label('next')}
                  ?disabled=${() => index.value + 1 >= words.value.length}
                  @click=${() => seek(index.value + 1)}>
                  <ore-icon name="chevron-right" aria-hidden="true"></ore-icon>
                </ore-button>
              </ore-tooltip>
              <ore-tooltip content=${() => label('restart')}>
                <ore-button
                  icon-only
                  rounded="full"
                  variant="ghost"
                  aria-label=${() => label('restart')}
                  ?disabled=${() => !words.value.length}
                  @click=${restart}>
                  <ore-icon name="refresh-cw" aria-hidden="true"></ore-icon>
                </ore-button>
              </ore-tooltip>
              <ore-tooltip
                content=${() => (supportsFullscreen() ? fullscreenLabel.value : label('fullscreenUnsupported'))}>
                <ore-button
                  class="fullscreen"
                  ref="${fullscreenButton}"
                  icon-only
                  rounded="full"
                  variant="ghost"
                  aria-label=${fullscreenLabel}
                  ?disabled=${() => !supportsFullscreen()}
                  @click=${toggleFullscreen}>
                  <ore-icon
                    name=${() => (fullscreen.value ? 'minimize' : 'maximize')}
                    aria-hidden="true"></ore-icon>
                </ore-button>
              </ore-tooltip>
            </div>
            <div class="pace-control">
              <div class="pace-meta">
                <span class="pace">${() => label('wpmShort')}</span>
                <span class="pace-value" aria-hidden="true">${wpm}</span>
              </div>
              <ore-slider
                min="100"
                max="600"
                step="25"
                color="primary"
                size="sm"
                value=${() => String(wpm.value)}
                aria-label=${() => label('wpm')}
                value-text=${() => `${wpm.value} ${label('wpm')}`}
                @change=${handleWpmChange}></ore-slider>
            </div>
            <ore-popover
              class="help"
              placement="bottom-end"
              label=${() => label('help')}
              @open-change=${(event: CustomEvent<OverlayOpenChangeDetail>) => {
                event.stopPropagation();
                if (
                  !event.detail.open &&
                  event.detail.reason === 'escape' &&
                  helpContent.value?.matches(':focus-within')
                ) {
                  helpButton.value?.focus();
                }
              }}>
              <ore-button
                ref="${helpButton}"
                icon-only
                rounded="full"
                variant="ghost"
                aria-label=${() => label('help')}>
                <ore-icon name="info" aria-hidden="true"></ore-icon>
              </ore-button>
              <div slot="content" class="help-content" ref="${helpContent}" tabindex="0">
                <p>${() => label('wpmHelp')}</p>
                <p>${() => label('paceHelp')}</p>
                <p>${() => label('tapHint')}</p>
                <strong>${() => label('shortcutsHeading')}</strong>
                <p>${() => label('shortcuts')}</p>
              </div>
            </ore-popover>
          </div>
        </div>
        <ore-accordion-item
          variant="bordered"
          style="--accordion-item-summary-padding: var(--size-4) var(--size-5)"
          ?expanded=${expanded}
          @expand=${() => {
            expanded.value = true;
            pause();
          }}
          @collapse=${() => {
            expanded.value = false;
          }}>
          <span slot="title">${() => label('fullText')}</span>
          <div class="full-text" part="full-text" dir="auto" ref="${fullText}" tabindex="0">${() => {
            const source = props.text.value ?? '';
            const word = current.value;
            return word
              ? html`${source.slice(0, word.start)}<mark aria-current="location">${source.slice(word.start, word.end)}</mark>${source.slice(word.end)}`
              : source;
          }}</div>
          <div class="context-controls" ?hidden=${() => !words.value.length}>
            <ore-select
              label=${() => label('sentence')}
              size="sm"
              value=${() => String(sentenceIndex.value)}
              @change=${(event: Event) => {
                event.stopPropagation();
                const target = event.currentTarget as HTMLElement & { value: string };
                const sentence = sentences.value[Number(target.value)];
                if (sentence) seek(sentence.index);
              }}>
              ${() =>
                sentences.value.map(
                  (sentence, i) => html`
                    <option value=${String(i)}>${sentenceOption(sentence, i)}</option>
                  `,
                )}
            </ore-select>
            <ore-button
              variant="flat"
              rounded="full"
              ?disabled=${() => overflow.value}
              @click=${() => {
                play();
                if (state.value === 'playing') toggleButton.value?.focus();
              }}>
              ${() => label('resumeHere')}
            </ore-button>
          </div>
        </ore-accordion-item>
      </div>
      <div class="sr-only" role="status">${announcement}</div>
    `;
  },
  styles: [srOnlyMixin, styles],
});
