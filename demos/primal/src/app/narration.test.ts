import { beforeEach, describe, expect, it, vi } from 'vitest';

// Node has no localStorage: the module reads it lazily, so a fake is installed
// before each dynamic import gives the module a fresh store.
function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
    writable: true,
  });
  return store;
}

async function importNarration() {
  vi.resetModules();
  return import('./narration');
}

describe('narration', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installStorage();
  });

  it('round-trips a reading position and clears it when finished', async () => {
    const narration = await importNarration();

    expect(narration.loadNarrationPosition('One. Two. Three.')).toBeUndefined();

    narration.saveNarrationPosition('One. Two. Three.', 1);
    expect(narration.loadNarrationPosition('One. Two. Three.')).toBe(1);

    narration.clearNarrationPosition('One. Two. Three.');
    expect(narration.loadNarrationPosition('One. Two. Three.')).toBeUndefined();
  });

  it('keys a position by its text: a changed entry never inherits one', async () => {
    const narration = await importNarration();

    narration.saveNarrationPosition('One. Two. Three.', 2);
    narration.saveNarrationPosition('One. Two.', 1);

    expect(narration.loadNarrationPosition('One. Two. Three.')).toBe(2);
    expect(narration.loadNarrationPosition('One. Two.')).toBe(1);
    expect(narration.loadNarrationPosition('One. Two. Three. Four.')).toBeUndefined();
  });

  it('ignores a corrupted position store', async () => {
    storage.set('primal:speech-position', 'not json');
    const narration = await importNarration();

    expect(narration.loadNarrationPosition('One. Two.')).toBeUndefined();

    // The corrupted store is replaced, not trusted, by the next save.
    narration.saveNarrationPosition('One. Two.', 0);
    expect(narration.loadNarrationPosition('One. Two.')).toBe(0);
  });

  it('persists the chosen pace and falls back to normal', async () => {
    storage.set('primal:speech-rate', '0.85');
    const narration = await importNarration();

    expect(narration.narrationRate.value).toBe(0.85);

    narration.setNarrationRate(1.15);
    expect(narration.narrationRate.value).toBe(1.15);
    expect(storage.get('primal:speech-rate')).toBe('1.15');

    // Nonsense values never become a pace.
    narration.setNarrationRate(Number.NaN);
    expect(narration.narrationRate.value).toBe(1.15);
  });

  it('reads normal pace from a missing or invalid stored value', async () => {
    storage.set('primal:speech-rate', 'swift');
    const narration = await importNarration();

    expect(narration.narrationRate.value).toBe(1);
  });

  it('holds one voice: a new claim stops the reader before it', async () => {
    const narration = await importNarration();
    const stopped: string[] = [];
    const first = { paused: false, source: 'Chapter 1', stop: () => stopped.push('first') };
    const second = { paused: false, source: 'Chapter 2', stop: () => stopped.push('second') };

    narration.startNarration(first);
    narration.startNarration(second);

    expect(stopped).toEqual(['first']);
    expect(narration.narration.value?.source).toBe('Chapter 2');

    // The foot chip stops the reader itself and releases the voice.
    narration.stopNarration();
    expect(stopped).toEqual(['first', 'second']);
    expect(narration.narration.value).toBeNull();
  });

  it('preserves position on reader handoff but resets it on explicit stop', async () => {
    const narration = await importNarration();
    const positions: boolean[] = [];
    const firstStop = (preservePosition = false) => positions.push(preservePosition);
    const secondStop = (preservePosition = false) => positions.push(preservePosition);

    narration.startNarration({ paused: false, source: 'Chapter 1', stop: firstStop });
    narration.startNarration({ paused: false, source: 'Chapter 2', stop: secondStop });
    narration.stopNarration();

    expect(positions).toEqual([true, false]);
  });

  it('releases without stopping when the reader already ended', async () => {
    const narration = await importNarration();
    const stopped: string[] = [];
    narration.startNarration({ paused: false, source: 'Chapter 1', stop: () => stopped.push('stop') });

    narration.releaseNarration();

    expect(stopped).toEqual([]);
    expect(narration.narration.value).toBeNull();
  });

  it('mirrors pause state only onto the voice it owns', async () => {
    const narration = await importNarration();
    const firstStop = () => {};
    const secondStop = () => {};
    narration.startNarration({ paused: false, source: 'Chapter 1', stop: firstStop });
    narration.startNarration({ paused: false, source: 'Chapter 2', stop: secondStop });

    narration.setNarrationPaused(firstStop, true);
    expect(narration.narration.value?.source).toBe('Chapter 2');
    expect(narration.narration.value?.paused).toBe(false);

    narration.setNarrationPaused(secondStop, true);
    expect(narration.narration.value?.paused).toBe(true);
  });
});
