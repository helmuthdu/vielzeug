import { afterEach, describe, expect, it, vi } from 'vitest';

import { BardError, BardLoadError } from '../errors';
import { createHarness } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loader', () => {
  it('loads assets and reports them with has()', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ a: '/a.wav', b: '/b.wav' });
    expect(bard.has('a')).toBe(true);
    expect(bard.has('b')).toBe(true);
    expect(bard.has('c')).toBe(false);
    expect(ctx.decodeCalls).toBe(2);
    bard.dispose();
  });

  it('deduplicates concurrent loads of the same URL', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ a: '/same.wav', b: '/same.wav' });
    expect(ctx.decodeCalls).toBe(1);
    bard.dispose();
  });

  it('does not re-fetch an already loaded key', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ a: '/a.wav' });
    await bard.load({ a: '/a.wav' });
    expect(ctx.decodeCalls).toBe(1);
    bard.dispose();
  });

  it('wraps fetch failures in BardLoadError', async () => {
    const { bard } = createHarness();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(0), ok: false, status: 404 })),
    );
    await expect(bard.load({ a: '/missing.wav' })).rejects.toBeInstanceOf(BardLoadError);
    bard.dispose();
  });

  it('emits load events for every key', async () => {
    const { bard, events } = createHarness();
    await bard.load({ a: '/a.wav' });
    expect(events.filter((e) => e.type === 'load').map((e) => (e as { key: string }).key)).toEqual(['a']);
    bard.dispose();
  });

  it('unload stops voices and drops the asset', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ a: '/a.wav' });
    bard.play('a', { loop: true });
    bard.unload('a');
    expect(bard.has('a')).toBe(false);
    const source = ctx.sources[0];
    expect(source?.stops.length).toBe(1);
    expect(() => bard.play('a')).toThrow(BardError);
    bard.dispose();
  });

  it('aborts an in-flight load through the signal', async () => {
    const { bard } = createHarness();
    const controller = new AbortController();
    const loading = bard.load({ a: '/a.wav' }, { signal: controller.signal });
    controller.abort();
    await expect(loading).rejects.toThrow();
    bard.dispose();
  });
});

describe('sprites', () => {
  it('plays a sprite region with offset and duration', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ sfx: { sprites: { hit: [0.2, 0.5] }, src: '/sfx.wav' } });
    bard.play('sfx:hit');
    const source = ctx.sources[0];
    expect(source?.started[0]).toMatchObject({ duration: 0.5, offset: 0.2 });
    bard.dispose();
  });

  it('has() resolves the parent asset for sprite keys', async () => {
    const { bard } = createHarness();
    await bard.load({ sfx: { sprites: { hit: [2, 0.5] }, src: '/sfx.wav' } });
    expect(bard.has('sfx:hit')).toBe(true);
    bard.dispose();
  });

  it('throws for an unknown sprite and for out-of-bounds regions', async () => {
    const { bard } = createHarness();
    await bard.load({ sfx: { sprites: { hit: [0.2, 0.5], huge: [0.5, 100] }, src: '/sfx.wav' } });
    expect(() => bard.play('sfx:nope')).toThrow(BardError);
    expect(() => bard.play('sfx:huge')).toThrow(BardError);
    bard.dispose();
  });

  it('loops the sprite region when loop is set', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ sfx: { sprites: { hit: [0.2, 0.5] }, src: '/sfx.wav' } });
    bard.play('sfx:hit', { loop: true });
    const source = ctx.sources[0];
    expect(source && 'loop' in source ? source.loop : false).toBe(true);
    if (source && 'loopStart' in source && 'loopEnd' in source) {
      expect(source.loopStart).toBe(0.2);
      expect(source.loopEnd).toBe(0.7);
    }
    bard.dispose();
  });
});
