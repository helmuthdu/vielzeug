import { type Fixture, mount } from '@vielzeug/ore/testing';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SPEECH_RATES, type SpeechPlayerElement, speechSentences } from './speech-player';

// ─── Mock engine ─────────────────────────────────────────────────────────────

/** Records what the engine was asked to say; tests drive the callbacks by hand. */
class FakeUtterance {
  text: string;
  lang = '';
  rate = 1;
  voice: { lang: string } | null = null;
  onstart: (() => void) | null = null;
  onboundary: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

let synth: {
  cancel: ReturnType<typeof vi.fn>;
  getVoices: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
};

function installSpeech(voices: Array<{ lang: string }> = [{ lang: 'en-US' }]): void {
  synth = {
    cancel: vi.fn(),
    getVoices: vi.fn(() => voices),
    pause: vi.fn(),
    resume: vi.fn(),
    speak: vi.fn(),
  };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth, writable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: FakeUtterance,
    writable: true,
  });
}

function removeSpeech(): void {
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined, writable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: undefined,
    writable: true,
  });
}

function spoken(): FakeUtterance[] {
  return synth.speak.mock.calls.map((call) => call[0] as FakeUtterance);
}

async function mountPlayer(
  text = '',
  options: { attrs?: Record<string, string>; props?: Record<string, unknown> } = {},
): Promise<Fixture<SpeechPlayerElement>> {
  return mount('ore-speech-player', { attrs: { text, ...options.attrs }, props: options.props });
}

const toggleOf = (fixture: Fixture<SpeechPlayerElement>): HTMLButtonElement =>
  fixture.element.shadowRoot?.querySelector<HTMLButtonElement>('[part="play"]')!;

const rateOf = (fixture: Fixture<SpeechPlayerElement>): HTMLButtonElement =>
  fixture.element.shadowRoot?.querySelector<HTMLButtonElement>('[part="rate"]')!;

const stopOf = (fixture: Fixture<SpeechPlayerElement>): HTMLButtonElement =>
  fixture.element.shadowRoot?.querySelector<HTMLButtonElement>('[part="stop"]')!;

const labelOf = (fixture: Fixture<SpeechPlayerElement>): HTMLElement =>
  fixture.element.shadowRoot?.querySelector<HTMLElement>('.toggle-label')!;

const liveOf = (fixture: Fixture<SpeechPlayerElement>): HTMLElement =>
  fixture.element.shadowRoot?.querySelector<HTMLElement>('[role="status"]')!;

/** The `progress` events of the reading the currently instrumented fixture reports. */
let progressEvents: Array<{ sentence: number; total: number }> = [];
const listenedFixtures = new WeakSet<SpeechPlayerElement>();

async function startReading(fixture: Fixture<SpeechPlayerElement>): Promise<void> {
  if (!listenedFixtures.has(fixture.element)) {
    listenedFixtures.add(fixture.element);
    fixture.element.addEventListener('progress', (event) => {
      progressEvents.push((event as CustomEvent<{ sentence: number; total: number }>).detail);
    });
  }
  progressEvents = [];
  await fixture.act(() => toggleOf(fixture).click());
}

describe('ore-speech-player', () => {
  let fixture: Fixture<SpeechPlayerElement>;

  beforeAll(async () => {
    await import('./speech-player');
  });

  afterEach(() => {
    fixture?.dispose();
    removeSpeech();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('shows the labeled invitation and hides the stop control while idle', async () => {
      installSpeech();
      fixture = await mountPlayer('The valley sleeps.');

      expect(toggleOf(fixture).disabled).toBe(false);
      expect(labelOf(fixture).textContent).toBe('Read aloud');
      expect(rateOf(fixture).getAttribute('aria-label')).toBe('Reading speed: normal');
      expect(rateOf(fixture).textContent).toContain('1×');
      expect(stopOf(fixture).hidden).toBe(true);
    });

    it('keeps the stop control beside the toggle and marks the speed control with a gauge icon', async () => {
      installSpeech();
      fixture = await mountPlayer('The valley sleeps.');

      const parts = [...fixture.element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.control')].map((control) =>
        control.getAttribute('part'),
      );
      expect(parts).toEqual(['play', 'stop', 'rate']);
      expect(rateOf(fixture).querySelector('ore-icon')?.getAttribute('name')).toBe('gauge');
    });

    it('disables the toggle when the text is empty or whitespace', async () => {
      installSpeech();
      fixture = await mountPlayer('   \n\t ');

      expect(toggleOf(fixture).disabled).toBe(true);
    });

    it('carries state=unsupported and disables the toggle when the API is missing', async () => {
      fixture = await mountPlayer('The valley sleeps.');

      expect(fixture.element.getAttribute('state')).toBe('unsupported');
      expect(toggleOf(fixture).disabled).toBe(true);
    });

    it('folds the visible label away once engaged', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence. Second sentence.');

      await startReading(fixture);
      expect(labelOf(fixture).hidden).toBe(true);

      await fixture.act(() => toggleOf(fixture).click());
      expect(labelOf(fixture).hidden).toBe(true);

      await fixture.act(() => stopOf(fixture).click());
      expect(labelOf(fixture).hidden).toBe(false);
    });
  });

  // ── Playback ───────────────────────────────────────────────────────────────

  describe('Playback', () => {
    it('speaks the first sentence and reports it as progress', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence. Second sentence.');

      await startReading(fixture);

      expect(fixture.element.getAttribute('state')).toBe('playing');
      expect(spoken()[0]?.text).toBe('First sentence.');
      expect(spoken()[0]?.rate).toBe(1);
      expect(progressEvents).toEqual([{ sentence: 0, total: 2 }]);
    });

    it('chains the next sentence as each ends and finishes to idle', async () => {
      installSpeech();
      fixture = await mountPlayer('One sentence. Two sentence. Three sentence.');
      const ends: string[] = [];
      fixture.element.addEventListener('end', () => ends.push('end'));

      await startReading(fixture);
      spoken()[0].onend?.();
      spoken()[1].onend?.();
      spoken()[2].onend?.();

      expect(spoken()).toHaveLength(3);
      expect(progressEvents).toEqual([
        { sentence: 0, total: 3 },
        { sentence: 1, total: 3 },
        { sentence: 2, total: 3 },
      ]);
      expect(fixture.element.getAttribute('state')).toBe('idle');
      expect(liveOf(fixture).textContent).toBe('Reading finished.');
      expect(ends).toEqual(['end']);
    });

    it('splits a sentence longer than the engine window and keeps its index on every piece', async () => {
      installSpeech();
      const wall = `${'word '.repeat(60).trim()}.`;
      fixture = await mountPlayer(`Before the wall. ${wall}`);

      await startReading(fixture);
      spoken()[0].onend?.();
      spoken()[1].onend?.();

      expect(spoken().length).toBeGreaterThanOrEqual(3);
      for (const utterance of spoken()) expect(utterance.text.length).toBeLessThanOrEqual(220);
      expect(progressEvents.slice(0, 3)).toEqual([
        { sentence: 0, total: 2 },
        { sentence: 1, total: 2 },
        { sentence: 1, total: 2 },
      ]);
    });

    it('pauses and resumes through the toggle', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence. Second sentence.');

      await startReading(fixture);
      await fixture.act(() => toggleOf(fixture).click());

      expect(fixture.element.getAttribute('state')).toBe('paused');
      expect(liveOf(fixture).textContent).toBe('Reading paused.');

      await fixture.act(() => toggleOf(fixture).click());

      expect(fixture.element.getAttribute('state')).toBe('playing');
      expect(liveOf(fixture).textContent).toBe('Reading resumed.');
    });

    it('stops on the stop control and ignores the canceled utterance events', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence. Second sentence.');

      await startReading(fixture);
      const canceled = spoken()[0];
      await fixture.act(() => stopOf(fixture).click());
      canceled.onend?.();

      expect(fixture.element.getAttribute('state')).toBe('idle');
      expect(liveOf(fixture).textContent).toBe('Reading stopped.');
      expect(spoken()).toHaveLength(1);
    });

    it('settles to idle and announces distinctly when an utterance errors', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence. Second sentence.');
      const errors: string[] = [];
      fixture.element.addEventListener('error', () => errors.push('error'));

      await startReading(fixture);
      await fixture.act(() => spoken()[0].onerror?.());

      expect(fixture.element.getAttribute('state')).toBe('idle');
      expect(liveOf(fixture).textContent).toBe('Reading was interrupted.');
      expect(errors).toEqual(['error']);
    });
  });

  // ── Resume position ────────────────────────────────────────────────────────

  describe('Resume position', () => {
    it('begins from the bound resume-at sentence', async () => {
      installSpeech();
      fixture = await mountPlayer('One. Two. Three. Four.', { attrs: { 'resume-at': '2' } });

      await startReading(fixture);

      expect(spoken()[0]?.text).toBe('Three.');
      expect(progressEvents).toEqual([{ sentence: 2, total: 4 }]);
    });

    it('clamps a resume-at beyond the end into the last sentence', async () => {
      installSpeech();
      fixture = await mountPlayer('One. Two.', { attrs: { 'resume-at': '9' } });

      await startReading(fixture);

      expect(spoken()[0]?.text).toBe('Two.');
    });

    it('restarts from the beginning with no resume-at bound', async () => {
      installSpeech();
      fixture = await mountPlayer('One. Two.');

      await startReading(fixture);

      expect(spoken()[0]?.text).toBe('One.');
    });
  });

  // ── Speed ──────────────────────────────────────────────────────────────────

  describe('Speed', () => {
    it('cycles normal, slow, fast and applies the rate to every utterance', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence. Second sentence.');
      const changes: number[] = [];
      fixture.element.addEventListener('rate-change', (event) => {
        changes.push((event as CustomEvent<{ rate: number }>).detail.rate);
      });

      await startReading(fixture);
      await fixture.act(() => rateOf(fixture).click());
      expect(changes).toEqual([0.85]);
      expect(rateOf(fixture).getAttribute('aria-label')).toBe('Reading speed: slow');
      expect(rateOf(fixture).textContent).toContain('0.85×');

      await fixture.act(() => rateOf(fixture).click());
      await fixture.act(() => rateOf(fixture).click());
      expect(changes).toEqual([0.85, 1.15, 1]);
      expect(rateOf(fixture).getAttribute('aria-label')).toBe('Reading speed: normal');
    });

    it('restarts the current sentence at the new pace while reading', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence. Second sentence.');

      await startReading(fixture);
      spoken()[0].onend?.();
      await fixture.act(() => rateOf(fixture).click());

      expect(synth.cancel).toHaveBeenCalled();
      expect(spoken()).toHaveLength(3);
      expect(spoken()[2]?.text).toBe('Second sentence.');
      expect(spoken()[2]?.rate).toBe(0.85);
      expect(progressEvents.at(-1)).toEqual({ sentence: 1, total: 2 });
    });

    it('follows an externally bound rate', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence.', { attrs: { rate: '1.15' } });

      await startReading(fixture);

      expect(spoken()[0]?.rate).toBe(1.15);
      expect(rateOf(fixture).textContent).toContain('1.15×');
    });
  });

  // ── Resume watchdog ────────────────────────────────────────────────────────

  describe('Resume watchdog', () => {
    /** Captures timers instead of faking the clock — `act` flushes on real microtasks. */
    function captureTimers(): Array<() => void> {
      const timers: Array<() => void> = [];
      vi.spyOn(window, 'setTimeout').mockImplementation(((handler: () => void) => {
        timers.push(() => handler());
        return 0 as unknown as number;
      }) as unknown as typeof window.setTimeout);
      return timers;
    }

    it('re-speaks the current sentence when a long-held pause resumes into silence', async () => {
      installSpeech();
      const timers = captureTimers();
      let clock = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => clock);
      fixture = await mountPlayer('First sentence. Second sentence.');

      await startReading(fixture);
      spoken()[0].onend?.();
      await fixture.act(() => toggleOf(fixture).click());
      clock = 20_000;
      await fixture.act(() => toggleOf(fixture).click());

      expect(fixture.element.getAttribute('state')).toBe('playing');
      expect(timers).toHaveLength(1);
      timers[0]();

      // The frozen engine never pulsed — the current sentence restarts instead of lying.
      expect(synth.cancel).toHaveBeenCalled();
      expect(spoken().at(-1)?.text).toBe('Second sentence.');
      expect(progressEvents.at(-1)).toEqual({ sentence: 1, total: 2 });
    });

    it('leaves a healthy resume alone when the engine pulses', async () => {
      installSpeech();
      const timers = captureTimers();
      let clock = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => clock);
      fixture = await mountPlayer('First sentence. Second sentence.');

      await startReading(fixture);
      spoken()[0].onend?.();
      await fixture.act(() => toggleOf(fixture).click());
      clock = 20_000;
      await fixture.act(() => toggleOf(fixture).click());
      spoken()[1].onboundary?.();
      const cancels = synth.cancel.mock.calls.length;
      const spokenCount = spoken().length;
      timers[0]();

      expect(synth.cancel).toHaveBeenCalledTimes(cancels);
      expect(spoken()).toHaveLength(spokenCount);
    });

    it('trusts a short pause without demanding a pulse', async () => {
      installSpeech();
      const timers = captureTimers();
      fixture = await mountPlayer('First sentence. Second sentence.');

      await startReading(fixture);
      await fixture.act(() => toggleOf(fixture).click());
      await fixture.act(() => toggleOf(fixture).click());

      // No watchdog armed — the engine is trusted within the short-hold window.
      expect(timers).toHaveLength(0);
    });
  });

  // ── Imperative API ─────────────────────────────────────────────────────────

  describe('Imperative API', () => {
    it('play(), pause() and stop() behave as the controls do', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence. Second sentence.');

      await fixture.act(() => fixture.element.play());
      expect(fixture.element.getAttribute('state')).toBe('playing');

      await fixture.act(() => fixture.element.pause());
      expect(fixture.element.getAttribute('state')).toBe('paused');

      await fixture.act(() => fixture.element.stop());
      expect(fixture.element.getAttribute('state')).toBe('idle');
    });

    it('play() with no text does not speak', async () => {
      installSpeech();
      fixture = await mountPlayer('');

      await fixture.act(() => fixture.element.play());

      expect(synth.speak).not.toHaveBeenCalled();
    });

    it('cancels pending speech when the element is disposed', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence.');
      await startReading(fixture);

      fixture.dispose();

      expect(synth.cancel).toHaveBeenCalled();
    });
  });

  // ── One voice at a time ─────────────────────────────────────────────────────

  describe('One voice at a time', () => {
    it('stops the player already reading when another starts', async () => {
      installSpeech();
      const first = await mountPlayer('First player sentence.');
      const second = await mountPlayer('Second player sentence.');

      await startReading(first);
      await startReading(second);

      expect(first.element.getAttribute('state')).toBe('idle');
      expect(second.element.getAttribute('state')).toBe('playing');
      expect(spoken().map((utterance) => utterance.text)).toEqual([
        'First player sentence.',
        'Second player sentence.',
      ]);

      first.dispose();
      second.dispose();
    });
  });

  // ── Language ───────────────────────────────────────────────────────────────

  describe('Language', () => {
    it('passes lang through and picks a matching voice', async () => {
      installSpeech([{ lang: 'de-DE' }, { lang: 'en-US' }]);
      fixture = await mountPlayer('Das Tal schläft.', { attrs: { lang: 'de' } });

      await startReading(fixture);

      expect(spoken()[0].lang).toBe('de');
      expect(spoken()[0].voice).toEqual({ lang: 'de-DE' });
    });

    it('falls back to the lang hint when no voice has loaded', async () => {
      installSpeech([]);
      fixture = await mountPlayer('Das Tal schläft.', { attrs: { lang: 'de' } });

      await startReading(fixture);

      expect(spoken()[0].lang).toBe('de');
      expect(spoken()[0].voice).toBeNull();
    });
  });

  // ── Labels ─────────────────────────────────────────────────────────────────

  describe('Labels', () => {
    it('overrides the default control names and announcements', async () => {
      installSpeech();
      fixture = await mountPlayer('First sentence.', {
        props: {
          labels: {
            read: 'Vorlesen',
            speed: 'Lesegeschwindigkeit',
            speedNormal: 'normal',
            stopped: 'Vorlesen gestoppt.',
          },
        },
      });

      expect(toggleOf(fixture).getAttribute('aria-label')).toBe('Vorlesen');
      expect(labelOf(fixture).textContent).toBe('Vorlesen');
      expect(rateOf(fixture).getAttribute('aria-label')).toBe('Lesegeschwindigkeit: normal');

      await startReading(fixture);
      await fixture.act(() => stopOf(fixture).click());
      expect(liveOf(fixture).textContent).toBe('Vorlesen gestoppt.');
    });
  });

  // ── Sentence splitting ─────────────────────────────────────────────────────

  describe('speechSentences', () => {
    it('splits printed prose into its sentences', () => {
      expect(speechSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
      expect(speechSentences('He said "Stay." Then left.')).toEqual(['He said "Stay."', 'Then left.']);
    });

    it('keeps a trailing unterminated sentence', () => {
      expect(speechSentences('Ended. Hanging tail')).toEqual(['Ended.', 'Hanging tail']);
    });

    it('returns no sentences for empty or whitespace-only text', () => {
      expect(speechSentences('')).toEqual([]);
      expect(speechSentences('   \n\t ')).toEqual([]);
    });
  });

  it('exposes the rate steps the speed control cycles', () => {
    expect([...SPEECH_RATES]).toEqual([1, 0.85, 1.15]);
  });
});
