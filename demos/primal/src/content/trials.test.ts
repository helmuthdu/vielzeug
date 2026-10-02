import { describe, expect, it } from 'vitest';
import type { TrialBiomeId } from '../domain/types';
import { expansions } from './expansions';
import { monsterById, monsters } from './monsters';
import { biomeSpecialRule } from './special-rules';
import { terrainById, terrains } from './terrain';
import {
  BIOME_EXPANSION,
  TRIAL_HUNTS,
  TRIAL_RANK_LEVELS,
  TRIAL_SCORE_LEVELS,
  TRIAL_SERIES,
  TRIAL_TOKEN_LABELS,
  trialBiomeArtwork,
  trialEncounterTerrain,
  trialRankHeat,
} from './trials';

const TERRAIN_IDS = terrains.map((terrain) => terrain.id);

/**
 * The trial catalog contract: the twelve extracted cards (docs/trials) reference
 * real monsters, terrains and expansions, keep unique stable ids and printed numbering,
 * and the Winds series carry complete die maps: a typo'd id or a lost die face would
 * surface in the app as a broken setup instead of a validation failure.
 */

const EXPANSION_IDS = new Set(expansions.map((expansion) => expansion.id));
const ELEMENT_IDS = new Set(['fire', 'thunder', 'coral', 'crystal', 'metal', 'horn', 'ice', 'venom', 'feather']);
const ALL_ENTITIES = [...TRIAL_HUNTS, ...TRIAL_SERIES];

describe('trial catalog', () => {
  it('uses stable, unique, kebab-case ids', () => {
    const ids = ALL_ENTITIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });

  it('covers the printed numbering exactly once', () => {
    expect(TRIAL_HUNTS.map((hunt) => hunt.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(TRIAL_SERIES.map((series) => series.number)).toEqual([11, 12]);
  });

  it('gives every series its cover art path', () => {
    for (const series of TRIAL_SERIES) {
      expect(series.art, series.id).toMatch(/^\/backgrounds\/bg_[a-z0-9_-]+\.webp$/);
    }
  });

  it('references catalog monsters at a legal aggression', () => {
    for (const hunt of TRIAL_HUNTS) {
      const monster = monsterById(hunt.monsterId);
      expect(monster, hunt.id).toBeDefined();
      expect(monster?.aggressionLevels, hunt.id).toContain(hunt.aggression);
    }
  });

  it('references valid expansions and elements', () => {
    for (const hunt of TRIAL_HUNTS) {
      for (const id of hunt.requiredExpansionIds) expect(EXPANSION_IDS.has(id), `${hunt.id}: ${id}`).toBe(true);
      for (const id of hunt.forbiddenElementIds) expect(ELEMENT_IDS.has(id), `${hunt.id}: ${id}`).toBe(true);
    }
    for (const series of TRIAL_SERIES) {
      for (const id of series.recommendedExpansionIds) expect(EXPANSION_IDS.has(id), `${series.id}: ${id}`).toBe(true);
    }
  });

  it('references real terrain tokens', () => {
    for (const hunt of TRIAL_HUNTS) {
      for (const component of hunt.components) {
        if (component.terrainId) expect(terrainById(component.terrainId), `${hunt.id}`).toBeDefined();
      }
    }
    for (const series of TRIAL_SERIES) {
      for (const monster of series.monsters) {
        const placed = monster.setups.flatMap((setup) => setup.terrain);
        expect(placed.length, `${series.id}/${monster.monsterId}`).toBeGreaterThan(0);
        for (const placement of placed) {
          expect(terrainById(placement.terrainId), `${series.id}/${placement.terrainId}`).toBeDefined();
        }
      }
    }
  });

  it('places trial terrain on real board sectors', () => {
    const sectors = new Set(['front', 'left-flank', 'right-flank', 'rear', 'edges']);
    const tokens = new Set([...Object.keys(TRIAL_TOKEN_LABELS), ...TERRAIN_IDS]);
    const placements = [
      ...TRIAL_HUNTS.flatMap((hunt) => hunt.terrain.map((placement) => [hunt.id, placement] as const)),
      ...TRIAL_SERIES.flatMap((series) =>
        series.monsters.flatMap((monster) =>
          monster.setups.flatMap((setup) => setup.terrain.map((placement) => [setup.biome, placement] as const)),
        ),
      ),
    ];
    for (const [owner, placement] of placements) {
      expect(sectors, `${owner}/${placement.sector}`).toContain(placement.sector);
      expect(tokens, `${owner}/${placement.terrainId}`).toContain(placement.terrainId);
    }
  });

  it('keeps every score modifier and ranking well-formed', () => {
    const countRow = (condition: string) => /^(?:each|victory for each)\b/i.test(condition);
    for (const hunt of TRIAL_HUNTS) {
      expect(hunt.scoring.modifiers.length, hunt.id).toBeGreaterThan(0);
      for (const modifier of hunt.scoring.modifiers) {
        expect(modifier.points, hunt.id).not.toBe(0);
        expect(['always', 'victory']).toContain(modifier.scope);
        expect(['count', 'flag'], `${hunt.id}: ${modifier.condition}`).toContain(modifier.kind);
        expect(modifier.kind === 'count', `${hunt.id}: ${modifier.condition}`).toBe(countRow(modifier.condition));
      }
      expect(hunt.specialRules.length, hunt.id).toBeGreaterThan(0);
      expect(hunt.rankings.length, hunt.id).toBe(6);
      for (const [index, ranking] of hunt.rankings.slice(0, 5).entries()) {
        expect(ranking.minScore, `${hunt.id} #${index}`).toBeGreaterThan(hunt.rankings[index + 1]?.minScore ?? -1);
      }
    }
    for (const series of TRIAL_SERIES) {
      for (const level of Object.values(series.scoreLevels)) {
        for (const modifier of level.modifiers) {
          expect(['count', 'flag'], `${series.id}: ${modifier.condition}`).toContain(modifier.kind);
          expect(modifier.kind === 'count', `${series.id}: ${modifier.condition}`).toBe(countRow(modifier.condition));
        }
      }
    }
  });

  it("prints no series table and keeps the solo hunts' bare thresholds", () => {
    // The series' ranking table is derived from the rulebook in the scoring module; the
    // series cards themselves print no second table.
    for (const series of TRIAL_SERIES) expect('rankings' in series).toBe(false);
    // The solo hunts keep bare thresholds: their score sheets stay the compact chip track.
    for (const hunt of TRIAL_HUNTS) {
      for (const tier of hunt.rankings) expect(tier.text, `${hunt.id}/${tier.name}`).toBeUndefined();
    }
  });

  it('shades every named level at the same place on the shared heat scale', () => {
    expect(TRIAL_RANK_LEVELS).toHaveLength(9);
    expect(trialRankHeat('Rookie')).toBe(0);
    expect(trialRankHeat('Expert')).toBe(12.5);
    expect(trialRankHeat('Beast Master')).toBe(50);
    expect(trialRankHeat('Dragon Slayer')).toBe(62.5);
    expect(trialRankHeat('Nightmare')).toBe(100);
    expect(trialRankHeat('Not A Level')).toBeUndefined();
  });

  it('prints one standard score worksheet across the series', () => {
    // The ascent's chapters climb the same levels, so every series must print them identically.
    for (const series of TRIAL_SERIES) {
      expect(series.scoreLevels, series.id).toEqual(TRIAL_SCORE_LEVELS);
    }
    expect(TRIAL_SCORE_LEVELS[1].base).toBe(10);
    expect(TRIAL_SCORE_LEVELS[3].base).toBe(20);
    expect(TRIAL_SCORE_LEVELS[1].modifiers).toHaveLength(4);
  });

  it('carries complete die maps in the Winds series', () => {
    for (const series of TRIAL_SERIES) {
      expect(series.monsters, series.id).toHaveLength(6);
      expect(new Set(series.monsters.map((monster) => monster.monsterId)).size, series.id).toBe(6);
      for (const monster of series.monsters) {
        expect(monsterById(monster.monsterId), `${series.id}/${monster.monsterId}`).toBeDefined();
        const rolls = monster.setups.map((setup) => setup.roll).sort();
        expect(rolls, `${series.id}/${monster.monsterId}`).toEqual([1, 2, 3, 4, 5, 6]);
        for (const setup of monster.setups) {
          expect(BIOME_EXPANSION[setup.biome], `${series.id}/${monster.monsterId}/${setup.biome}`).toBeDefined();
        }
      }
      expect(series.scoreLevels[1].base, series.id).toBe(10);
      expect(series.scoreLevels[2].base, series.id).toBe(15);
      expect(series.scoreLevels[3].base, series.id).toBe(20);
      expect(series.expeditionCount, series.id).toBe(5);
      expect(series.maxWoundCards, series.id).toBe(3);
    }
  });

  it('maps every biome label to an expansion box', () => {
    const known = new Set(Object.keys(BIOME_EXPANSION) as TrialBiomeId[]);
    const used = new Set<TrialBiomeId>();
    for (const series of TRIAL_SERIES) {
      for (const monster of series.monsters) for (const setup of monster.setups) used.add(setup.biome);
    }
    for (const biome of used) expect(known.has(biome), biome).toBe(true);
    for (const biome of known) expect(used.has(biome), `${biome} unused`).toBe(true);
  });

  it('maps every die-face biome to its own background art', () => {
    expect(trialBiomeArtwork('crystal-caves')).toBe('/backgrounds/bg_bioma_crystal_cave.webp');
    expect(trialBiomeArtwork('flooded-wilds')).toBe('/backgrounds/bg_bioma_flooded_wilds.webp');
    expect(trialBiomeArtwork('endless-swamp')).toBe('/backgrounds/bg_bioma_endless_swamp.webp');
    expect(trialBiomeArtwork('nightmare')).toBe('/backgrounds/bg_bioma_nightmare.webp');
    expect(trialBiomeArtwork('frozen-wastes')).toBe('/backgrounds/bg_bioma_frozen_wastes.webp');
    expect(trialBiomeArtwork('woltyar')).toBe('/backgrounds/bg_bioma_woltyar.webp');
    expect(trialBiomeArtwork('sunset-plains')).toBe('/backgrounds/bg_bioma_sunset_plains.webp');
    expect(trialBiomeArtwork('niz-maraga')).toBe('/backgrounds/bg_bioma_niz_maraga.webp');
    expect(trialBiomeArtwork('thunder-mountains')).toBe('/backgrounds/bg_bioma_thundner_mountains.webp');
    expect(trialBiomeArtwork('goldarks')).toBe('/backgrounds/bg_bioma_goldarks.webp');
  });

  it('resolves a rolled face through its own printed terrain', () => {
    // The same biome can print different tokens on two faces of the same map, so the
    // encounter resolves by monster and face: hydar's two Endless Swamp faces differ.
    expect(trialEncounterTerrain('hydar', 1)).toEqual([
      { count: 1, sector: 'rear', terrainId: 'swamp' },
      { count: 1, sector: 'front', terrainId: 'swamp' },
      { count: 1, sector: 'right-flank', terrainId: 'baethanis' },
      { count: 1, sector: 'left-flank', terrainId: 'baethanis' },
    ]);
    expect(trialEncounterTerrain('hydar', 3)).toEqual([
      { count: 1, sector: 'rear', terrainId: 'brush' },
      { count: 1, sector: 'right-flank', terrainId: 'brush' },
      { count: 1, sector: 'left-flank', terrainId: 'swamp' },
      { count: 1, sector: 'left-flank', terrainId: 'baethanis' },
      { count: 1, sector: 'front', terrainId: 'swamp' },
      { count: 1, sector: 'front', terrainId: 'baethanis' },
    ]);
    // A monster outside the series, or a face it does not print, resolves to a bare board.
    expect(trialEncounterTerrain('vyraxen', 1)).toEqual([]);
    expect(trialEncounterTerrain('ozew', 1)).toEqual([]);
  });

  it("rides the rolled biome's board rule with the encounter", () => {
    const tide = biomeSpecialRule('flooded-wilds');
    expect(tide?.title).toContain('Flooded Wilds');
    expect(tide?.text).toContain('tide rises');
    // Every biome a die face can land on carries its own board rule: including the second
    // board of each biome box (Nightmare, Thunder Mountains, Sunset Plains).
    const dieMapBiomes = new Set(
      TRIAL_SERIES.flatMap((series) =>
        series.monsters.flatMap((monster) => monster.setups.map((setup) => setup.biome)),
      ),
    );
    for (const biome of dieMapBiomes) {
      expect(biomeSpecialRule(biome), biome).toBeDefined();
    }
    expect(biomeSpecialRule('nightmare')?.text).toContain('Transformation token');
  });

  it('hunts a distinct printed monster set', () => {
    // Ten solo cards hunt nine distinct monsters (Korowon stars in #4 and #10); the two
    // series add twelve more rosters (Korowon, Ozew and Dygorax also appear in a series).
    const huntMonsters = new Set(TRIAL_HUNTS.map((hunt) => hunt.monsterId));
    expect(huntMonsters.size).toBe(9);
    const seriesMonsters = new Set(TRIAL_SERIES.flatMap((series) => series.monsters.map((m) => m.monsterId)));
    expect(seriesMonsters.size).toBe(12);
    for (const id of [...huntMonsters, ...seriesMonsters]) {
      expect(
        monsters.some((monster) => monster.id === id),
        id,
      ).toBe(true);
    }
  });
});
