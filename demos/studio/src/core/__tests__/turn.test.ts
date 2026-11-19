import { describe, expect, it } from 'vitest';
import type { EncounterState, Unit } from '../encounter.ts';
import { planTurn, reachableCells } from '../turn.ts';

function unit(overrides: Partial<Unit> & { id: string }): Unit {
  return { move: 3, name: overrides.id, q: 0, r: 0, range: 1, team: 'enemy', ...overrides };
}

function state(overrides: Partial<EncounterState> = {}): EncounterState {
  return { blocked: [], grid: 'square', units: [], ...overrides };
}

describe('planEnemyTurn', () => {
  it('holds when no heroes exist', () => {
    const plan = planTurn(state({ units: [unit({ id: 'e1' })] }));
    expect(plan.enemyPlans[0]?.attacks).toBeNull();
    expect(plan.enemyPlans[0]?.destination).toEqual({ q: 0, r: 0 });
    expect(plan.enemyPlans[0]?.reasons[0]).toMatch(/No heroes/);
    expect(plan.next).toEqual(state({ units: [unit({ id: 'e1' })] }));
  });

  it('stays and attacks when already in reach', () => {
    const plan = planTurn(
      state({
        units: [unit({ id: 'e1', q: 2, r: 0 }), unit({ id: 'h1', q: 3, r: 0, team: 'hero' })],
      }),
    );
    const [first] = plan.enemyPlans;
    expect(first?.attacks).toBe('h1');
    expect(first?.destination).toEqual({ q: 2, r: 0 });
    expect(first?.route).toEqual([{ q: 2, r: 0 }]);
    expect(first?.reasons.join(' ')).toMatch(/Already within 1 cell; attacks h1/);
  });

  it('moves up to its budget toward the nearest hero', () => {
    const plan = planTurn(
      state({
        units: [unit({ id: 'e1', move: 3, q: 0, r: 0 }), unit({ id: 'h1', q: 10, r: 0, team: 'hero' })],
      }),
    );
    const [first] = plan.enemyPlans;
    expect(first?.destination).toEqual({ q: 3, r: 0 });
    expect(first?.attacks).toBeNull();
    expect(first?.route).toEqual([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 3, r: 0 },
    ]);
    expect(plan.next.units.find((u) => u.id === 'e1')).toMatchObject({ q: 3, r: 0 });
  });

  it('does not enter the hero cell even when the budget allows it', () => {
    const plan = planTurn(
      state({
        units: [unit({ id: 'e1', move: 9, q: 0, r: 0 }), unit({ id: 'h1', q: 3, r: 0, team: 'hero' })],
      }),
    );
    const [first] = plan.enemyPlans;
    // Adjacent (distance 1) is within reach 1: it stops next to the hero and attacks.
    expect(first?.destination).toEqual({ q: 2, r: 0 });
    expect(first?.attacks).toBe('h1');
  });

  it('holds position when the hero is walled off', () => {
    const wall = [
      { q: 5, r: -1 },
      { q: 5, r: 0 },
      { q: 5, r: 1 },
    ].map((c) => `${String(c.q)}:${String(c.r)}`);
    const plan = planTurn(
      state({
        blocked: wall,
        units: [unit({ id: 'e1', q: 0, r: 0 }), unit({ id: 'h1', q: 6, r: 0, team: 'hero' })],
      }),
    );
    // The hero is reachable by walking around the wall (gap above/below).
    expect(plan.enemyPlans[0]?.destination.q).toBeGreaterThan(0);
  });

  it('holds when truly unreachable', () => {
    // A 4-way ring of blockers seals the hero in: no path crosses it.
    const wall = ['9:0', '11:0', '10:-1', '10:1'];
    const plan = planTurn(
      state({
        blocked: wall,
        units: [unit({ id: 'e1', move: 3, q: 0, r: 0 }), unit({ id: 'h1', q: 10, r: 0, team: 'hero' })],
      }),
    );
    expect(plan.enemyPlans[0]?.destination).toEqual({ q: 0, r: 0 });
    expect(plan.enemyPlans[0]?.reasons.join(' ')).toMatch(/cannot reach any hero/);
  });

  it('breaks equal-distance ties by unit order', () => {
    const plan = planTurn(
      state({
        units: [
          unit({ id: 'e1', q: 0, r: 0 }),
          unit({ id: 'hA', q: 0, r: 4, team: 'hero' }),
          unit({ id: 'hB', q: 4, r: 0, team: 'hero' }),
        ],
      }),
    );
    expect(plan.enemyPlans[0]?.reasons[0]).toMatch(/hA \(equally close; first in order\)/);
    expect(plan.enemyPlans[0]?.destination).toEqual({ q: 0, r: 3 });
  });

  it('resolves enemies sequentially so two never share a cell', () => {
    const plan = planTurn(
      state({
        units: [
          unit({ id: 'e1', move: 3, q: 0, r: 0 }),
          unit({ id: 'e2', move: 3, q: -1, r: 0 }),
          unit({ id: 'h1', q: 3, r: 0, team: 'hero' }),
        ],
      }),
    );
    const keys = plan.next.units.map((u) => `${String(u.q)}:${String(u.r)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses hex distance on hex grids', () => {
    const plan = planTurn(
      state({
        grid: 'hex',
        units: [unit({ id: 'e1', move: 2, q: 0, r: 0 }), unit({ id: 'h1', q: 5, r: 0, team: 'hero' })],
      }),
    );
    const [first] = plan.enemyPlans;
    expect(first?.destination).toEqual({ q: 2, r: 0 });
    expect(first?.attacks).toBeNull();
  });

  it('a ranged enemy attacks from outside melee after moving', () => {
    const plan = planTurn(
      state({
        units: [unit({ id: 'e1', move: 2, q: 0, r: 0, range: 4 }), unit({ id: 'h1', q: 6, r: 0, team: 'hero' })],
      }),
    );
    const [first] = plan.enemyPlans;
    expect(first?.destination).toEqual({ q: 2, r: 0 });
    expect(first?.attacks).toBe('h1');
    expect(first?.reasons.join(' ')).toMatch(/within 4 cells; attacks/);
  });
});

describe('reachableCells', () => {
  it('floods within the movement budget', () => {
    const cells = reachableCells(state({ units: [unit({ id: 'e1', move: 2, q: 0, r: 0 })] }), 'e1');
    expect(cells.get('0:0')).toBe(0);
    expect(cells.get('2:0')).toBe(2);
    expect(cells.has('3:0')).toBe(false);
  });

  it('excludes cells occupied by other units', () => {
    const cells = reachableCells(
      state({ units: [unit({ id: 'e1', move: 2, q: 0, r: 0 }), unit({ id: 'h1', q: 1, r: 0, team: 'hero' })] }),
      'e1',
    );
    expect(cells.has('1:0')).toBe(false);
    // 4-way movement: the hero at (1,0) cuts off (2,0) entirely.
    expect(cells.has('2:0')).toBe(false);
    expect(cells.has('0:1')).toBe(true);
  });

  it('returns nothing for an unknown unit', () => {
    expect(reachableCells(state(), 'nope').size).toBe(0);
  });
});

describe('planEnemyTurn kills', () => {
  it('removes a hero killed by an attack and reports it', () => {
    const plan = planTurn(
      state({
        units: [unit({ id: 'e1', q: 2, r: 0 }), unit({ id: 'h1', q: 3, r: 0, team: 'hero' })],
      }),
    );
    expect(plan.heroKills).toEqual(['h1']);
    expect(plan.next.units.map((u) => u.id)).toEqual(['e1']);
    expect(plan.wipeout).toBe(true);
    // The fallen marker belongs where the hero stood when it fell.
    expect(plan.fallen).toEqual([{ cell: { q: 3, r: 0 }, name: 'h1' }]);
  });

  it('marks the fallen at the cell they held after moving this round', () => {
    // e1 moves from (0,0) next to h1 and kills it; the hero never moves,
    // so the mark sits on the hero's cell, not the attacker's start.
    const plan = planTurn(
      state({
        units: [unit({ id: 'e1', q: 0, r: 0 }), unit({ id: 'h1', q: 3, r: 0, team: 'hero' })],
      }),
    );
    expect(plan.heroKills).toEqual(['h1']);
    expect(plan.fallen).toEqual([{ cell: { q: 3, r: 0 }, name: 'h1' }]);
  });

  it('keeps surviving heroes and reports no wipeout', () => {
    const plan = planTurn(
      state({
        units: [
          unit({ id: 'e1', q: 2, r: 0 }),
          unit({ id: 'h1', q: 3, r: 0, team: 'hero' }),
          unit({ id: 'h2', q: -5, r: 0, team: 'hero' }),
        ],
      }),
    );
    expect(plan.heroKills).toEqual(['h1']);
    expect(plan.next.units.map((u) => u.id)).toEqual(['e1', 'h2']);
    expect(plan.wipeout).toBe(false);
  });

  it('a later enemy does not avenge a hero already killed this turn', () => {
    const plan = planTurn(
      state({
        units: [
          unit({ id: 'e1', q: 2, r: 0 }),
          unit({ id: 'e2', q: 2, r: 4 }),
          unit({ id: 'h1', q: 3, r: 0, team: 'hero' }),
        ],
      }),
    );
    // e1 kills h1; e2 must then find no reachable hero and hold.
    expect(plan.heroKills).toEqual(['h1']);
    expect(plan.enemyPlans[1]?.attacks).toBeNull();
    expect(plan.enemyPlans[1]?.reasons[0]).toMatch(/No heroes/);
    expect(plan.enemyPlans[1]?.destination).toEqual({ q: 2, r: 4 });
  });
});

describe('planTurn hero phase', () => {
  it('heroes fight back after the enemy phase', () => {
    const plan = planTurn(
      state({
        units: [
          unit({ id: 'e1', q: 2, r: 0 }),
          unit({ id: 'h1', q: 3, r: 0, team: 'hero' }),
          unit({ id: 'h2', q: -3, r: 0, team: 'hero' }),
        ],
      }),
    );
    // e1 kills h1 first, so only h2 acts in the hero phase.
    expect(plan.heroKills).toEqual(['h1']);
    expect(plan.heroPlans.map((entry) => entry.unitId)).toEqual(['h2']);
    expect(plan.heroPlans[0]?.reasons.join(' ')).toMatch(/Targets e1/);
  });

  it('a hero in reach kills the enemy it attacks', () => {
    const plan = planTurn(
      state({
        units: [unit({ id: 'e1', q: 0, r: 6 }), unit({ id: 'h1', q: 0, r: 0, range: 2, team: 'hero' })],
      }),
    );
    expect(plan.enemyKills).toEqual(['e1']);
    expect(plan.next.units.map((u) => u.id)).toEqual(['h1']);
    expect(plan.wipeout).toBe(false);
  });

  it('a hero closes the distance when the enemy is out of reach', () => {
    const plan = planTurn(
      state({
        units: [unit({ id: 'e1', move: 1, q: 0, r: 8 }), unit({ id: 'h1', move: 3, q: 0, r: 0, team: 'hero' })],
      }),
    );
    expect(plan.heroPlans[0]?.destination).toEqual({ q: 0, r: 3 });
    expect(plan.heroPlans[0]?.attacks).toBeNull();
  });

  it('holds when no enemies exist', () => {
    const plan = planTurn(state({ units: [unit({ id: 'h1', team: 'hero' })] }));
    expect(plan.heroPlans[0]?.attacks).toBeNull();
    expect(plan.heroPlans[0]?.reasons[0]).toMatch(/No enemies/);
    expect(plan.heroPlans[0]?.destination).toEqual({ q: 0, r: 0 });
  });

  it('a hero killed this round never acts', () => {
    const plan = planTurn(
      state({
        units: [unit({ id: 'e1', q: 2, r: 0 }), unit({ id: 'h1', q: 3, r: 0, team: 'hero' })],
      }),
    );
    expect(plan.heroPlans).toEqual([]);
    expect(plan.wipeout).toBe(true);
  });
});
