import { type Fixture, mount } from '@vielzeug/ore/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SpeedReadingElement } from './speed-reading';
import './speed-reading';

describe('ore-speed-reading', () => {
  let fixture: Fixture<SpeedReadingElement>;
  const mountReader = async (attrs: Record<string, string> = {}) => {
    fixture = await mount('ore-speed-reading', { attrs: { text: 'One two three.', ...attrs } });
    return fixture;
  };
  const clock = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  const advance = async (milliseconds: number) => {
    await vi.advanceTimersByTimeAsync(milliseconds);
    await fixture.flush();
  };
  const position = () => Number(fixture.element.getAttribute('word-index'));
  const state = () => fixture.element.getAttribute('state');
  const query = (part: string) => fixture.element.shadowRoot!.querySelector<HTMLElement>(`[part="${part}"]`)!;

  afterEach(() => {
    fixture?.dispose();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts idle with the first word visible and no automatic playback', async () => {
    await mountReader();
    expect(state()).toBe('idle');
    expect(position()).toBe(0);
    expect(query('word').textContent?.trim()).toBe('One');
    expect(query('word').getAttribute('aria-hidden')).toBe('true');
    expect(query('full-text').textContent).toBe('One two three.');
    expect(query('viewport').getAttribute('tabindex')).toBe('0');
  });

  it('dwells on every word and emits end only after the final dwell', async () => {
    await mountReader();
    clock();
    const progress = vi.fn();
    const end = vi.fn();
    fixture.element.addEventListener('progress', progress);
    fixture.element.addEventListener('end', end);
    await fixture.act(() => fixture.element.play());
    await advance(239);
    expect(position()).toBe(0);
    await advance(1);
    expect(position()).toBe(1);
    expect(progress.mock.calls[0][0].detail).toEqual({ end: 7, index: 1, start: 4, total: 3 });
    await advance(240);
    expect(position()).toBe(2);
    expect(state()).toBe('playing');
    await advance(479);
    expect(end).not.toHaveBeenCalled();
    await advance(1);
    expect(state()).toBe('ended');
    expect(end).toHaveBeenCalledOnce();
    await advance(2000);
    expect(end).toHaveBeenCalledOnce();
  });

  it('uses punctuation and paragraph dwell without compounded delays', async () => {
    await mountReader({ text: 'One,\n\ntwo.' });
    clock();
    fixture.element.play();
    await advance(719);
    expect(position()).toBe(0);
    await advance(1);
    expect(position()).toBe(1);
  });

  it('pauses without changing position and resumes with a fresh dwell', async () => {
    await mountReader();
    clock();
    const pause = vi.fn();
    fixture.element.addEventListener('pause', pause);
    fixture.element.play();
    await advance(100);
    await fixture.act(() => fixture.element.pause());
    fixture.element.pause();
    expect(pause).toHaveBeenCalledOnce();
    await advance(1000);
    expect(position()).toBe(0);
    fixture.element.play();
    await advance(239);
    expect(position()).toBe(0);
    await advance(1);
    expect(position()).toBe(1);
  });

  it('restarts to idle and plays again from the beginning after completion', async () => {
    await mountReader({ text: 'One two' });
    clock();
    fixture.element.play();
    await advance(480);
    expect(state()).toBe('ended');
    await fixture.act(() => fixture.element.play());
    expect(position()).toBe(0);
    expect(state()).toBe('playing');
    await advance(240);
    await fixture.act(() => fixture.element.restart());
    expect(position()).toBe(0);
    expect(state()).toBe('idle');
    await advance(1000);
    expect(position()).toBe(0);
  });

  it('seeks and clamps while pausing playback', async () => {
    await mountReader();
    clock();
    fixture.element.play();
    await fixture.act(() => fixture.element.seek(1.9));
    expect(position()).toBe(1);
    expect(state()).toBe('paused');
    await fixture.act(() => fixture.element.seek(999));
    expect(position()).toBe(2);
    await fixture.act(() => fixture.element.seek(-1));
    expect(position()).toBe(0);
    await advance(1000);
    expect(position()).toBe(0);
  });

  it('follows an external position without echoing duplicate progress events', async () => {
    await mountReader({ 'word-index': '1' });
    expect(position()).toBe(1);
    const progress = vi.fn();
    fixture.element.addEventListener('progress', progress);
    await fixture.act(() => fixture.element.setAttribute('word-index', '2'));
    expect(position()).toBe(2);
    expect(progress).toHaveBeenCalledOnce();
    await fixture.act(() => fixture.element.setAttribute('word-index', '2'));
    expect(progress).toHaveBeenCalledOnce();
  });

  it('reschedules the current word immediately when WPM changes', async () => {
    await mountReader();
    clock();
    fixture.element.play();
    await advance(100);
    await fixture.act(() => (fixture.element.wpm = 600));
    await advance(99);
    expect(position()).toBe(0);
    await advance(1);
    expect(position()).toBe(1);
  });

  it.each([
    ['20', '100'],
    ['900', '600'],
    ['NaN', '250'],
    ['Infinity', '250'],
  ])('normalizes WPM %s to %s in the pace slider', async (input, expected) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mountReader({ wpm: input });
    expect(fixture.query('ore-slider')?.getAttribute('value')).toBe(expected);
    if (input === 'NaN' || input === 'Infinity') expect(warn).toHaveBeenCalled();
  });

  it('rejects invalid imperative seek values without exposing the text', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mountReader();
    await fixture.act(() => fixture.element.seek(Number.NaN));
    expect(position()).toBe(0);
    expect(warn).toHaveBeenCalledWith('[@vielzeug/refine] ore-speed-reading: word-index must be a finite number.');
  });

  it('resets and pauses on text replacement, but not when identical text is reapplied', async () => {
    await mountReader();
    clock();
    fixture.element.play();
    await advance(240);
    await fixture.act(() => (fixture.element.text = 'One two three.'));
    expect(position()).toBe(1);
    expect(state()).toBe('playing');
    await fixture.act(() => (fixture.element.text = 'New text'));
    expect(position()).toBe(0);
    expect(state()).toBe('idle');
    expect(query('word').textContent?.trim()).toBe('New');
    await advance(1000);
    expect(position()).toBe(0);
  });

  it('disables playback and stepping for empty text', async () => {
    await mountReader({ text: '  \n' });
    await fixture.act(() => fixture.element.play());
    expect(state()).toBe('idle');
    for (const button of fixture.queryAll('[part="controls"] ore-button'))
      expect(button.hasAttribute('disabled')).toBe(true);
    expect(query('viewport').textContent).toContain('Add text to begin.');
  });

  it('pauses on document hiding and does not resume automatically', async () => {
    await mountReader();
    clock();
    fixture.element.play();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    await fixture.act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(state()).toBe('paused');
    fixture.element.play();
    await advance(1000);
    expect(position()).toBe(0);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    await fixture.act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(state()).toBe('paused');
  });

  it('pauses when full text opens without restarting when it closes', async () => {
    await mountReader();
    clock();
    fixture.element.play();
    const disclosure = fixture.query('ore-accordion-item')!;
    await fixture.act(() => disclosure.dispatchEvent(new CustomEvent('expand')));
    expect(state()).toBe('paused');
    await fixture.act(() => disclosure.dispatchEvent(new CustomEvent('collapse')));
    await advance(1000);
    expect(state()).toBe('paused');
    expect(position()).toBe(0);
  });

  it('scopes keyboard stepping and playback to the reader viewport', async () => {
    await mountReader();
    clock();
    await fixture.act(() => query('viewport').dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' })));
    expect(state()).toBe('playing');
    await fixture.act(() =>
      query('viewport').dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })),
    );
    expect(state()).toBe('paused');
    expect(position()).toBe(1);
    await fixture.act(() =>
      fixture.query('ore-slider')!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })),
    );
    expect(position()).toBe(1);
  });

  it('does not announce each word or move focus', async () => {
    await mountReader();
    clock();
    query('viewport').focus();
    fixture.element.play();
    await advance(240);
    expect(fixture.query('[role="status"]')?.textContent).toBe('Reading started.');
    expect(fixture.element.shadowRoot!.activeElement).toBe(query('viewport'));
    expect(query('word').getAttribute('aria-hidden')).toBe('true');
  });

  it('honors a pause requested synchronously by a progress listener', async () => {
    await mountReader();
    clock();
    fixture.element.addEventListener('progress', () => fixture.element.pause());
    fixture.element.play();
    await advance(1000);
    expect(position()).toBe(1);
    expect(state()).toBe('paused');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores an old timeout callback after seeking', async () => {
    await mountReader();
    clock();
    const timeouts = vi.spyOn(globalThis, 'setTimeout');
    fixture.element.play();
    const callback = timeouts.mock.calls.at(-1)![0];
    await fixture.act(() => fixture.element.seek(2));
    if (typeof callback !== 'function') throw new Error('Expected a playback callback');
    await fixture.act(() => callback());
    expect(position()).toBe(2);
    expect(state()).toBe('paused');
  });

  it('does not run a catch-up burst after a delayed callback', async () => {
    await mountReader();
    clock();
    const timeouts = vi.spyOn(globalThis, 'setTimeout');
    fixture.element.play();
    const callback = timeouts.mock.calls.at(-1)![0];
    vi.spyOn(performance, 'now').mockReturnValue(30_000);
    if (typeof callback !== 'function') throw new Error('Expected a playback callback');
    await fixture.act(() => callback());
    expect(position()).toBe(1);
    expect(timeouts.mock.calls.at(-1)![1]).toBe(240);
  });

  it('cancels playback when a progress listener replaces the source', async () => {
    await mountReader();
    clock();
    fixture.element.addEventListener(
      'progress',
      () => {
        fixture.element.text = 'Replacement text';
      },
      { once: true },
    );
    fixture.element.play();
    await advance(1000);
    expect(position()).toBe(0);
    expect(state()).toBe('idle');
    expect(query('word').textContent?.trim()).toBe('Replacement');
  });

  it('honors restart from a play listener without leaving a timer', async () => {
    await mountReader();
    clock();
    fixture.element.addEventListener('play', () => fixture.element.restart());
    fixture.element.play();
    await advance(1000);
    expect(state()).toBe('idle');
    expect(position()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('normalizes invalid initial position and invalid language with explicit warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mountReader({ lang: 'not_a_locale', 'word-index': 'NaN' });
    expect(warn).toHaveBeenCalledWith('[@vielzeug/refine] ore-speed-reading: invalid lang; using en.');
    expect(warn).toHaveBeenCalledWith(
      '[@vielzeug/ore] prop.number(): attribute value "NaN" is not a valid number, using default (0)',
    );
    expect(position()).toBe(0);
  });

  it('retokenizes and pauses when language changes', async () => {
    await mountReader();
    clock();
    fixture.element.play();
    await advance(240);
    await fixture.act(() => (fixture.element.lang = 'de'));
    expect(state()).toBe('idle');
    expect(position()).toBe(0);
  });

  it('emits numeric speed changes from the pace slider', async () => {
    await mountReader();
    expect(fixture.query('.pace-value')?.textContent).toBe('250');
    const change = vi.fn();
    fixture.element.addEventListener('wpm-change', change);
    const slider = fixture.query('ore-slider') as HTMLElement & { value: string };
    await fixture.act(() => {
      slider.value = '450';
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(change.mock.calls[0][0].detail).toEqual({ wpm: 450 });
    expect(fixture.element.wpm).toBe(450);
    expect(fixture.query('.pace-value')?.textContent).toBe('450');
  });

  it('disposes timers and never advances after removal', async () => {
    await mountReader();
    clock();
    fixture.element.play();
    await fixture.act(() => fixture.element.remove());
    await advance(1000);
    expect(position()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not autoplay when reconnected and can be started explicitly again', async () => {
    await mountReader();
    clock();
    fixture.element.play();
    await advance(240);
    const parent = fixture.element.parentElement!;
    await fixture.act(() => fixture.element.remove());
    await fixture.act(() => parent.appendChild(fixture.element));
    expect(state()).not.toBe('playing');
    expect(position()).toBe(1);
    await advance(1000);
    expect(position()).toBe(1);
    await fixture.act(() => fixture.element.play());
    await advance(240);
    expect(position()).toBe(2);
  });

  it('renders markup as literal text and permits independent instances', async () => {
    await mountReader({ text: '<img src=x onerror=alert(1)> text' });
    expect(query('full-text').querySelector('img')).toBeNull();
    expect(query('full-text').textContent).toContain('<img');
    const other = await mount('ore-speed-reading', { attrs: { text: 'Independent reader' } });
    try {
      clock();
      fixture.element.play();
      other.element.play();
      await advance(240);
      expect(position()).toBe(1);
      expect(other.element.getAttribute('word-index')).toBe('1');
      fixture.element.pause();
      expect(other.element.getAttribute('state')).toBe('playing');
    } finally {
      other.dispose();
    }
  });

  it('localizes controls and announcements', async () => {
    await mountReader();
    await fixture.act(
      () =>
        (fixture.element.labels = {
          help: 'Lesehilfe',
          play: 'Lesen',
          started: 'Gestartet',
          wpm: 'Wörter pro Minute',
          wpmShort: 'WpM',
        }),
    );
    expect(fixture.query('.toggle')?.getAttribute('aria-label')).toBe('Lesen');
    expect(fixture.query('.pace')?.textContent).toBe('WpM');
    expect(fixture.query('ore-slider')?.getAttribute('aria-label')).toBe('Wörter pro Minute');
    expect(fixture.query('.help ore-button')?.getAttribute('aria-label')).toBe('Lesehilfe');
    await fixture.act(() => fixture.element.play());
    expect(fixture.query('[role="status"]')?.textContent).toBe('Gestartet');
  });

  it('has no structural accessibility violations', async () => {
    await mountReader();
    const result = await axeCheck(fixture.element);
    expect(result.violations).toEqual([]);
  });

  it('names each icon-only playback action and retains visible status', async () => {
    await mountReader({ text: 'One' });
    clock();
    expect(fixture.query('.toggle')?.getAttribute('aria-label')).toBe('Start reading');
    expect(fixture.query('.toggle ore-icon')?.getAttribute('name')).toBe('play');
    await fixture.act(() => fixture.element.play());
    expect(fixture.query('.toggle')?.getAttribute('aria-label')).toBe('Pause');
    expect(fixture.query('.toggle ore-icon')?.getAttribute('name')).toBe('pause');
    await fixture.act(() => fixture.element.pause());
    expect(fixture.query('.toggle')?.getAttribute('aria-label')).toBe('Resume');
    expect(query('status').textContent).toContain('Reading paused.');
    fixture.element.play();
    await advance(240);
    expect(fixture.query('.toggle')?.getAttribute('aria-label')).toBe('Read again');
    expect(query('status').textContent).toContain('Reading finished.');
  });

  it('keeps pace and keyboard explanations in help rather than persistent rows', async () => {
    await mountReader();
    expect(fixture.query('.control-help')).toBeNull();
    expect(fixture.query('.help-content')?.textContent).toContain('Words per minute');
    expect(fixture.query('.help-content')?.textContent).toContain('Focused reading display');
    for (const button of fixture.queryAll('.toolbar ore-button')) {
      expect(button.hasAttribute('icon-only')).toBe(true);
      expect(button.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('highlights the exact current token without changing the selectable source', async () => {
    await mountReader({ text: 'One  two.\nThree four.' });
    await fixture.act(() => fixture.element.seek(1));
    expect(query('full-text').querySelector('mark')?.textContent).toBe('two.');
    expect(query('full-text').textContent).toBe('One  two.\nThree four.');
    expect(query('full-text').querySelector('mark')?.getAttribute('aria-current')).toBe('location');
  });

  it('lets a reader choose a sentence without automatically starting playback', async () => {
    await mountReader({ text: 'One two. Three four.' });
    const select = fixture.query('ore-select') as HTMLElement & { value: string };
    await fixture.act(() => {
      select.value = '1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(position()).toBe(2);
    expect(state()).toBe('paused');
    expect(query('full-text').querySelector('mark')?.textContent).toBe('Three');
    await fixture.act(() => fixture.query('.context-controls ore-button')!.click());
    expect(state()).toBe('playing');
    expect(position()).toBe(2);
  });

  it('shows why a hidden tab paused playback', async () => {
    await mountReader();
    fixture.element.play();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    await fixture.act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(query('status').textContent).toContain('Paused because the tab was hidden.');
  });

  it('keeps the final word visible and states completion once', async () => {
    await mountReader({ text: 'One two' });
    clock();
    fixture.element.play();
    await advance(480);
    expect(state()).toBe('ended');
    expect(query('word').hidden).toBe(false);
    expect(query('word').textContent?.trim()).toBe('two');
    expect(query('viewport').textContent).not.toContain('Reading finished.');
    expect(query('status').textContent).toContain('Reading finished.');
  });

  it('steps and toggles through viewport tap zones', async () => {
    await mountReader({ text: 'One two three' });
    const display = query('viewport');
    display.getBoundingClientRect = () => ({ height: 128, left: 100, top: 0, width: 300 }) as DOMRect;
    const tap = async (ratio: number) => {
      const point = { clientX: 100 + ratio * 300, clientY: 10 };
      await fixture.act(() =>
        display.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', ...point })),
      );
      await fixture.act(() =>
        display.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', ...point })),
      );
    };
    await tap(0.9);
    expect(position()).toBe(1);
    await tap(0.1);
    expect(position()).toBe(0);
    await tap(0.5);
    expect(state()).toBe('playing');
    await tap(0.5);
    expect(state()).toBe('paused');
    await fixture.act(() =>
      display.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, clientX: 250, clientY: 10, pointerType: 'mouse' }),
      ),
    );
    expect(position()).toBe(0);
  });

  it('reflects the fullscreen attribute from the browser state without changing playback', async () => {
    await mountReader();
    fixture.element.play();
    await fixture.act(() => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: fixture.element });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(fixture.element.hasAttribute('fullscreen')).toBe(true);
    expect(state()).toBe('playing');
    await fixture.act(() => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(fixture.element.hasAttribute('fullscreen')).toBe(false);
    expect(state()).toBe('playing');
  });

  it('requests fullscreen through the browser API and reflects the granted state', async () => {
    await mountReader();
    const requestFullscreen = vi.fn(() => Promise.resolve());
    Object.defineProperty(fixture.element, 'requestFullscreen', { configurable: true, value: requestFullscreen });
    await fixture.act(() => fixture.element.enterFullscreen());
    expect(requestFullscreen).toHaveBeenCalledOnce();
    await fixture.act(() => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: fixture.element });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(fixture.element.hasAttribute('fullscreen')).toBe(true);
    const exitFullscreen = vi.fn(() => Promise.resolve());
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen });
    await fixture.act(() => fixture.element.exitFullscreen());
    expect(exitFullscreen).toHaveBeenCalledOnce();
  });

  it('warns and leaves state unchanged when the browser has no fullscreen API', async () => {
    await mountReader();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(fixture.element, 'requestFullscreen', { configurable: true, value: undefined });
    await fixture.act(() => fixture.element.enterFullscreen());
    expect(fixture.element.hasAttribute('fullscreen')).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('requestFullscreen is unavailable'));
    const control = fixture.element.shadowRoot!.querySelector<HTMLElement>('.fullscreen')!;
    await fixture.act(() => control.click());
    expect(control.getAttribute('aria-disabled')).toBe('true');
    expect(fixture.element.hasAttribute('fullscreen')).toBe(false);
  });

  it('names the fullscreen control for its current state', async () => {
    await mountReader();
    const control = fixture.element.shadowRoot!.querySelector<HTMLElement>('.fullscreen')!;
    expect(control.getAttribute('aria-label')).toBe('Enter fullscreen');
    await fixture.act(() => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: fixture.element });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(control.getAttribute('aria-label')).toBe('Exit fullscreen');
  });
});
