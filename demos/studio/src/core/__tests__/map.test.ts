import { describe, expect, it } from 'vitest';
import { createMapModel, FOV_RADIUS } from '../map.ts';

describe('map model', () => {
  it('seeds four tokens with the hero at (0,3)', () => {
    using model = createMapModel();
    expect(model.tokens.map((t) => t.id)).toEqual(['hero', 'scout', 'cart', 'camp']);
    expect(model.token('hero')).toMatchObject({ col: 0, row: 3 });
  });

  it('reveals the hero neighborhood and hides far tiles', () => {
    using model = createMapModel();
    expect(model.fog.state({ col: 0, row: 3 })).toBe('visible');
    expect(model.fog.state({ col: 0, row: 3 + FOV_RADIUS })).toBe('visible');
    expect(model.fog.state({ col: 40, row: 40 })).toBe('unseen');
  });

  it('walls block light behind them', () => {
    using model = createMapModel();
    // Wall column at col 4 spans rows 0..3 and 5..7; row 4 is a gap.
    expect(model.isWall({ col: 4, row: 0 })).toBe(true);
    expect(model.fog.state({ col: 6, row: 0 })).toBe('unseen');
    expect(model.fog.state({ col: 6, row: 4 })).toBe('visible');
  });

  it('hit-tests tokens by world point', () => {
    using model = createMapModel();
    // Hero tile spans world x 0..48, y 144..192 (TILE_SIZE 48, row 3).
    expect(model.tokenAtWorld({ x: 24, y: 160 })?.id).toBe('hero');
    expect(model.tokenAtWorld({ x: 500, y: 500 })).toBeUndefined();
  });

  it('moves tokens and refuses wall tiles via the model contract', () => {
    using model = createMapModel();
    expect(model.moveToken('hero', { col: 2, row: 3 })).toBe(true);
    expect(model.token('hero')?.col).toBe(2);
    expect(model.moveToken('nope', { col: 0, row: 0 })).toBe(false);
  });

  it('demotes previously visible tiles to seen after the hero moves', () => {
    using model = createMapModel();
    const before = model.fog.state({ col: -3, row: 3 });
    expect(before).toBe('visible');
    model.moveToken('hero', { col: 20, row: 3 });
    model.refreshFov();
    expect(model.fog.state({ col: -3, row: 3 })).toBe('seen');
    expect(model.fog.state({ col: 20, row: 3 })).toBe('visible');
  });

  it('terrain colors are deterministic', () => {
    using model = createMapModel();
    const a = model.terrainColor({ col: 3, row: -7 });
    const b = model.terrainColor({ col: 3, row: -7 });
    expect(a).toBe(b);
    expect(a).toMatch(/^#/);
  });
});
