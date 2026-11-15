import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBard } from '../bard';
import { BardDisposedError, BardError, BardUnsupportedError } from '../errors';
import { FakeAudioContext } from '../testing';
import { createHarness } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lifecycle and SSR safety', () => {
  it('does not touch window, document, or a context until first use', () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('AudioContext', undefined);
    const bard = createBard();
    expect(bard.state).toBe('idle');
    expect(bard.context).toBeNull();
    bard.dispose();
  });

  it('throws BardUnsupportedError without an AudioContext', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('AudioContext', undefined);
    const bard = createBard();
    await expect(bard.unlock()).rejects.toBeInstanceOf(BardUnsupportedError);
    bard.dispose();
  });

  it('reports state transitions through tap', async () => {
    const { bard, events } = createHarness();
    await bard.unlock();
    expect(bard.state).toBe('running');
    const states = events.filter((e) => e.type === 'state').map((e) => (e as { state: string }).state);
    expect(states).toContain('running');
    bard.dispose();
  });

  it('removes every unlock listener once the context is running', async () => {
    const { bard, win } = createHarness();
    await bard.unlock();
    expect(win.count('pointerup')).toBe(0);
    expect(win.count('keydown')).toBe(0);
    bard.dispose();
  });

  it('resumes on a gesture while suspended and detaches listeners', async () => {
    const { bard, ctx, win } = createHarness();
    // Force creation without resuming.
    bard.synth({ duration: 0.1, freq: 440 });
    expect(ctx.state).toBe('suspended');
    expect(win.count('pointerup')).toBe(1);
    win.dispatch('pointerup');
    await Promise.resolve();
    expect(ctx.state).toBe('running');
    expect(win.count('pointerup')).toBe(0);
    bard.dispose();
  });

  it('dispose is idempotent, blocks later use, and never closes an injected context', async () => {
    const { bard, ctx } = createHarness();
    await bard.unlock();
    bard.dispose();
    bard.dispose();
    expect(bard.disposed).toBe(true);
    expect(bard.state).toBe('closed');
    expect(() => bard.play('anything')).toThrow(BardDisposedError);
    expect(bard.disposalSignal.aborted).toBe(true);
    expect(ctx.closed).toBe(false); // injected contexts are not owned
  });

  it('closes a context it created itself', async () => {
    const ctx = new FakeAudioContext();
    // `new` on a regular function that returns an object yields that object.
    vi.stubGlobal('AudioContext', function AudioContext() {
      return ctx;
    });
    vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });
    const bard = createBard();
    await bard.unlock();
    bard.dispose();
    expect(ctx.closed).toBe(true);
  });

  it('supports Symbol.dispose', async () => {
    const { bard } = createHarness();
    await bard.unlock();
    {
      using engine = bard;
      expect(engine).toBe(bard);
    }
    expect(bard.disposed).toBe(true);
  });
});

describe('errors', () => {
  it('play on an unknown key throws BardError', () => {
    const { bard } = createHarness();
    expect(() => bard.play('missing')).toThrow(BardError);
    bard.dispose();
  });

  it('bus on an unknown name throws BardError', () => {
    const { bard } = createHarness();
    expect(() => bard.bus('nope')).toThrow(BardError);
    bard.dispose();
  });

  it('rejects the reserved master bus name', () => {
    expect(() => createHarness({ buses: ['master'] })).toThrow(BardError);
  });
});
