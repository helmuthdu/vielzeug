import { describe, expect, it } from 'vitest';
import { monsterDamageFor, monsterStances } from './monster-damage';
import { monsterById, monsters } from './monsters';

describe('monster stance damage', () => {
  it('loads the complete Standard and Nightmare tables', () => {
    expect(monsters).toHaveLength(23);
    expect(monsters.flatMap((monster) => monster.stanceDamage)).toHaveLength(155);

    for (const monster of monsters.filter(({ id }) => id !== 'the-awakened')) {
      expect(monster.stanceDamage.filter((row) => !row.nightmare).map((row) => row.aggression)).toEqual([0, 1, 2, 3]);
      expect(monster.stanceDamage.filter((row) => row.nightmare).map((row) => row.aggression)).toEqual([1, 2, 3]);
      expect(new Set(monster.stanceDamage.map((row) => `${row.aggression}-${row.nightmare}`))).toHaveLength(7);
    }
  });

  it('resolves per-player damage by aggression, stance and variant', () => {
    const kharja = monsterById('kharja');
    const korowon = monsterById('korowon');
    const awakened = monsterById('the-awakened');

    expect(monsterDamageFor(kharja!, 2)?.stances).toEqual({ 1: 10, 2: 16, 3: 20 });
    expect(monsterDamageFor(kharja!, 3, true)?.stances).toEqual({ 1: 21, 2: 28, 3: 35 });
    expect(monsterDamageFor(korowon!, 2)?.stances[2]).toBe(0);
    expect(monsterDamageFor(awakened!, 3)?.stances).toEqual({ 1: 30, 2: 40, 3: 50, 4: 60, 5: 60 });
  });

  it("counts each monster's stance cards from its damage rows", () => {
    expect(monsterStances(monsterById('kharja')!)).toEqual([1, 2, 3]);
    expect(monsterStances(monsterById('the-awakened')!)).toEqual([1, 2, 3, 4, 5]);
    for (const monster of monsters) {
      expect(monsterStances(monster)).toHaveLength(monster.id === 'the-awakened' ? 5 : 3);
    }
  });
});
