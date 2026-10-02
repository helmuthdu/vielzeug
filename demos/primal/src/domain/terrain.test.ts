import { describe, expect, it } from 'vitest';
import { terrains } from '../content';
import { PrimalDomainError } from './errors';
import { createExpedition, setExpeditionHunters, setExpeditionMonster, setExpeditionScenario } from './expedition';
import {
  baseTerrainTokens,
  carrierTerrain,
  liveTerrain,
  placeTerrain,
  removeTerrain,
  transformTerrain,
} from './terrain';
import type { Expedition } from './types';

const NOW = '2026-01-01T00:00:00.000Z';

/** Vyraxen's first expedition scenario: brush, cyricae and rock across the sectors. */
const hunt = (): Expedition => {
  let subject = createExpedition('e1', ['core'], NOW);
  subject = setExpeditionHunters(subject, ['daeron', 'mirah'], NOW);
  subject = setExpeditionMonster(subject, 'vyraxen', NOW);
  return setExpeditionScenario(subject, 'vyraxen-expedition-1', NOW);
};

describe('terrain tokens', () => {
  it('expands the printed placements into one token per count, with stable ids', () => {
    const tokens = baseTerrainTokens([
      { count: 2, sector: 'front', terrainId: 'ice' },
      { count: 1, sector: null, terrainId: 'water' },
    ]);
    expect(tokens).toEqual([
      { id: 'b0-0', sector: 'front', terrainId: 'ice' },
      { id: 'b0-1', sector: 'front', terrainId: 'ice' },
      { id: 'b1-0', sector: null, terrainId: 'water' },
    ]);
  });

  it('resolves the carrier scenario’s printed terrain', () => {
    const base = carrierTerrain(hunt());
    expect(base.length).toBeGreaterThan(0);
    expect(base.every((placement) => placement.terrainId)).toBe(true);
  });

  it('places a token beyond the printed setup and keeps it through the live list', () => {
    const placed = placeTerrain(hunt(), 'rear', 'fire', NOW);
    const live = liveTerrain(placed);
    const fire = live.filter((token) => token.terrainId === 'fire');
    expect(fire).toHaveLength(1);
    expect(fire[0]?.sector).toBe('rear');
    expect(() => placeTerrain(hunt(), 'front', 'not-a-terrain', NOW)).toThrow(PrimalDomainError);
  });

  it('transforms one chip at a time: ice to water, water to fog', () => {
    let subject = placeTerrain(hunt(), null, 'ice', NOW);
    subject = placeTerrain(subject, null, 'ice', NOW);
    const ice = liveTerrain(subject).filter((token) => token.terrainId === 'ice');
    expect(ice).toHaveLength(2);

    subject = transformTerrain(subject, ice[0]!.id, NOW);
    let live = liveTerrain(subject);
    expect(live.filter((token) => token.terrainId === 'ice')).toHaveLength(1);
    expect(live.filter((token) => token.terrainId === 'water')).toHaveLength(1);

    // The transform only touches the one token: the untouched ice stays ice.
    subject = transformTerrain(subject, live.find((token) => token.terrainId === 'water')!.id, NOW);
    live = liveTerrain(subject);
    expect(live.filter((token) => token.terrainId === 'fog')).toHaveLength(1);
    expect(live.filter((token) => token.terrainId === 'ice')).toHaveLength(1);
  });

  it("resolves Fire's printed interaction with the sector it lands in", () => {
    // Left flank: printed brush, plus fight-placed water and ice.
    let subject = placeTerrain(hunt(), 'left-flank', 'water', NOW);
    subject = placeTerrain(subject, 'left-flank', 'ice', NOW);
    subject = placeTerrain(subject, 'left-flank', 'fire', NOW);
    const flank = liveTerrain(subject).filter((token) => token.sector === 'left-flank');
    expect(flank.filter((token) => token.terrainId === 'brush')).toHaveLength(0); // burned
    expect(flank.filter((token) => token.terrainId === 'water')).toHaveLength(1); // …the melted ice
    expect(flank.filter((token) => token.terrainId === 'ice')).toHaveLength(0); // melted
    expect(flank.filter((token) => token.terrainId === 'fog')).toHaveLength(1); // the placed water, replaced
    expect(flank.filter((token) => token.terrainId === 'fire')).toHaveLength(1);
    // Other sectors keep their brush.
    expect(liveTerrain(subject).some((token) => token.terrainId === 'brush' && token.sector === 'right-flank')).toBe(
      true,
    );
  });

  it('turns each water in the sector into fog: the chip changes, no new token is placed', () => {
    let subject = placeTerrain(hunt(), 'left-flank', 'water', NOW);
    subject = placeTerrain(subject, 'left-flank', 'water', NOW);
    subject = placeTerrain(subject, 'left-flank', 'fire', NOW);
    const flank = liveTerrain(subject).filter((token) => token.sector === 'left-flank');
    expect(flank.filter((token) => token.terrainId === 'fog')).toHaveLength(2);
    expect(flank.filter((token) => token.terrainId === 'water')).toHaveLength(0);
    expect(subject.monsterState.terrain.placed.filter((token) => token.terrainId === 'fog')).toHaveLength(0);
  });

  it('fire placed without a sector resolves no interactions', () => {
    const subject = placeTerrain(hunt(), null, 'fire', NOW);
    expect(liveTerrain(subject).some((token) => token.terrainId === 'brush')).toBe(true);
  });

  it('fog has no further step and refuses to transform', () => {
    const subject = placeTerrain(hunt(), 'front', 'fog', NOW);
    const token = liveTerrain(subject).find((entry) => entry.terrainId === 'fog');
    expect(() => transformTerrain(subject, token!.id, NOW)).toThrow(PrimalDomainError);
  });

  it('takes tokens off the board: printed ones are masked, placed ones are dropped', () => {
    const base = baseTerrainTokens(carrierTerrain(hunt()));
    const first = base[0]!;
    let subject = removeTerrain(hunt(), first.id, NOW);
    expect(liveTerrain(subject).some((token) => token.id === first.id)).toBe(false);

    subject = placeTerrain(subject, 'front', 'fire', NOW);
    const fire = liveTerrain(subject).find((token) => token.terrainId === 'fire')!;
    subject = removeTerrain(subject, fire.id, NOW);
    expect(liveTerrain(subject).some((token) => token.id === fire.id)).toBe(false);
    expect(subject.monsterState.terrain.placed).toHaveLength(0);
    expect(() => removeTerrain(hunt(), 'b99-0', NOW)).toThrow(PrimalDomainError);
  });

  it('keeps the catalog chain closed: every transform target exists', () => {
    for (const terrain of terrains) {
      if (!terrain.transformsTo) continue;
      expect(
        terrains.some((entry) => entry.id === terrain.transformsTo),
        `${terrain.id} transforms to ${terrain.transformsTo}`,
      ).toBe(true);
    }
  });

  it('holds tokens for placements of the same terrain in different sectors', () => {
    const subject = placeTerrain(placeTerrain(hunt(), 'front', 'ice', NOW), 'rear', 'ice', NOW);
    const groups = new Set(
      liveTerrain(subject)
        .filter((token) => token.terrainId === 'ice')
        .map((t) => t.sector),
    );
    expect([...groups].sort()).toEqual(['front', 'rear']);
  });
});
