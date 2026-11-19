import { findPath, reachable } from '@vielzeug/atlas/grid';
import { type Cell, cellKey, type EncounterState, inBounds, topologyFor, type Unit } from './encounter.ts';

/**
 * A full round: the enemy phase first, then the hero phase. In each phase the
 * acting units pick the opposing unit they can reach by the shortest path,
 * close in up to their movement budget, and attack when the target ends within
 * their reach. Units resolve in unit order, and each move updates occupancy
 * before the next unit plans, so two units never share a cell. A unit killed
 * earlier in the round never acts. Every decision carries a plain-language
 * reason.
 */

export interface UnitPlan {
  /** The opposing unit attacked from the destination, when any. */
  attacks: string | null;
  /** Where the unit ends the turn (its own cell when it holds). */
  destination: Cell;
  /** Plain-language lines explaining the decision. */
  reasons: readonly string[];
  /** Cells walked from the unit's cell to the destination, both ends included. */
  route: readonly Cell[];
  unitId: string;
}

export interface FallenMark {
  /** The cell the victim stood on when it fell. */
  cell: Cell;
  name: string;
}

export interface TurnPlan {
  /** Enemies removed by hero attacks this turn, in death order. */
  enemyKills: readonly string[];
  enemyPlans: readonly UnitPlan[];
  /** Every unit that fell this turn, marked on the map where it died. */
  fallen: readonly FallenMark[];
  /** Heroes removed by enemy attacks this turn, in death order. */
  heroKills: readonly string[];
  heroPlans: readonly UnitPlan[];
  /** The state after both phases, ready to apply as one command. */
  next: EncounterState;
  /** True when the turn left no enemies alive and the party still standing. */
  victory: boolean;
  /** True when the turn left no heroes alive. */
  wipeout: boolean;
}

/** "1 cell" / "3 cells" — the reasons read aloud must not say "1 cells". */
function cells(n: number): string {
  return n === 1 ? '1 cell' : `${String(n)} cells`;
}

function occupied(state: EncounterState): Set<string> {
  return new Set(state.units.map((unit) => cellKey(unit)));
}

/**
 * Cells an acting unit may pass through: in bounds, unblocked, and free of
 * other units. With `throughTargets` the opposing team's cells also pass,
 * which is what a path search needs (the target's cell is the goal); standing
 * there is never legal, so the movement flood and the overlay use the
 * stricter form.
 */
function passableFor(state: EncounterState, unitId: string, throughTargets = false): (cell: Cell) => boolean {
  const blocked = new Set(state.blocked);
  const taken = occupied(state);
  const self = state.units.find((u) => u.id === unitId);
  const targets = throughTargets ? new Set(state.units.filter((u) => self && u.team !== self.team).map(cellKey)) : null;
  const selfKey = cellKey(self ?? { q: Number.NaN, r: Number.NaN });
  return (cell) => {
    const key = cellKey(cell);
    if (!inBounds(cell) || blocked.has(key)) return false;
    if (key === selfKey) return true;
    if (targets?.has(key)) return true;
    return !taken.has(key);
  };
}

/**
 * Plans one full round. Deterministic: each phase resolves in the order units
 * appear in `state.units`, and equal-distance targets go to the earlier one.
 */
export function planTurn(state: EncounterState): TurnPlan {
  const topology = topologyFor(state.grid);
  let working: EncounterState = { ...state, units: state.units.map((unit) => ({ ...unit })) };
  const enemyPlans: UnitPlan[] = [];
  const heroPlans: UnitPlan[] = [];
  const heroKills: string[] = [];
  const enemyKills: string[] = [];
  const fallen: FallenMark[] = [];

  // Enemies act first, then the surviving heroes fight back.
  for (const [team, plans, kills] of [
    ['enemy', enemyPlans, heroKills],
    ['hero', heroPlans, enemyKills],
  ] as const) {
    for (const unit of state.units) {
      if (unit.team !== team) continue;
      // A unit killed earlier in this round never acts.
      if (!working.units.some((candidate) => candidate.id === unit.id)) continue;
      const plan = planOne(working, unit, topology);
      // The victim's cell is read from the working copy: it may have moved
      // earlier in this round, and the fallen marker belongs where it stood
      // when it fell, not where the encounter started.
      const victim = plan.attacks ? working.units.find((candidate) => candidate.id === plan.attacks) : undefined;
      // Apply the move and any kill to the working copy so later units see
      // the new occupancy and never avenge a target that is already gone.
      working = {
        ...working,
        units: working.units
          .map((candidate) =>
            candidate.id === plan.unitId ? { ...candidate, q: plan.destination.q, r: plan.destination.r } : candidate,
          )
          .filter((candidate) => candidate.id !== plan.attacks),
      };
      if (victim) {
        kills.push(victim.name);
        fallen.push({ cell: { q: victim.q, r: victim.r }, name: victim.name });
      }
      plans.push(plan);
    }
  }

  // A map that started without heroes is an empty sandbox, not a defeat;
  // only a turn that actually killed the last hero is a wipeout. Mirrored on
  // the other side: a kill count above zero already proves the field had
  // enemies, so the party wins when the round killed the last one.
  const heroesLeft = working.units.some((unit) => unit.team === 'hero');
  const wipeout = heroKills.length > 0 && !heroesLeft;
  const victory = enemyKills.length > 0 && !working.units.some((unit) => unit.team === 'enemy') && heroesLeft;
  return { enemyKills, enemyPlans, fallen, heroKills, heroPlans, next: working, victory, wipeout };
}

function planOne(state: EncounterState, actor: Unit, topology: ReturnType<typeof topologyFor>): UnitPlan {
  const from: Cell = { q: actor.q, r: actor.r };
  const label = actor.team === 'enemy' ? 'hero' : 'enemy';
  const passable = passableFor(state, actor.id, true);
  const standable = passableFor(state, actor.id);
  const targets = state.units.filter((unit) => unit.team !== actor.team);
  if (targets.length === 0) {
    return {
      attacks: null,
      destination: from,
      reasons: [`No ${label === 'hero' ? 'heroes' : 'enemies'} on the map; holds position.`],
      route: [from],
      unitId: actor.id,
    };
  }

  // Rule 1: nearest target by path cost; earlier in unit order wins ties.
  let target: Unit | null = null;
  let targetCost = Number.POSITIVE_INFINITY;
  let targetRoute: readonly Cell[] | null = null;
  let tied = false;
  for (const candidate of targets) {
    const to: Cell = { q: candidate.q, r: candidate.r };
    const route = findPath(from, to, { passable, topology });
    if (route === null) continue;
    // Path cost excludes the start; steps is the number of moves needed.
    const cost = route.length - 1;
    if (cost < targetCost) {
      target = candidate;
      targetCost = cost;
      targetRoute = route;
      tied = false;
    } else if (cost === targetCost) {
      tied = true;
    }
  }
  if (!target || !targetRoute) {
    return {
      attacks: null,
      destination: from,
      reasons: [`${actor.name} cannot reach any ${label}; holds position.`],
      route: [from],
      unitId: actor.id,
    };
  }

  const reasons: string[] = [
    `Targets ${target.name}${tied ? ' (equally close; first in order)' : ` (nearest, ${cells(targetCost)} away)`}.`,
  ];

  // Rule 2: already within reach (grid distance) means no move.
  const reach = topology.distance(from, { q: target.q, r: target.r });
  if (reach <= actor.range) {
    reasons.push(`Already within ${cells(actor.range)}; attacks ${target.name}.`);
    return { attacks: target.id, destination: from, reasons, route: [from], unitId: actor.id };
  }

  // Rule 3: flood the movement budget and take the legal cell that ends
  // closest to the target. The shortest route's own end is the target's cell,
  // which the actor may not enter, so the budget flood is the honest answer:
  // it respects occupancy as well as the budget.
  const flood = reachable(from, actor.move, { passable: standable, topology });
  let bestKey = cellKey(from);
  let best: { cost: number; cell: Cell; dist: number } = { cell: from, cost: 0, dist: reach };
  for (const [key, entry] of flood) {
    if (entry.prev === null) continue;
    const cell = cellFromKey(key);
    const dist = topology.distance(cell, { q: target.q, r: target.r });
    if (dist < best.dist || (dist === best.dist && entry.cost < best.cost)) {
      best = { cell, cost: entry.cost, dist };
      bestKey = key;
    }
  }
  const destination = best.cell;
  const route = routeTo(flood, bestKey, topology);
  const attacks = best.dist <= actor.range ? target.id : null;
  if (best.cost > 0) {
    reasons.push(`Moves ${cells(best.cost)} toward ${target.name}.`);
  } else {
    reasons.push('No legal cell is closer; holds position.');
  }
  reasons.push(
    attacks
      ? `${target.name} is within ${cells(actor.range)}; attacks.`
      : `${target.name} is ${cells(best.dist)} away; no attack.`,
  );

  return { attacks, destination, reasons, route, unitId: actor.id };
}

function cellFromKey(key: string): Cell {
  const [q, r] = key.split(':').map(Number);
  return { q: q as number, r: r as number };
}

/** Walks a flood's predecessors back from a cell to the start. */
function routeTo(
  flood: Map<string, { cost: number; prev: Cell | null }>,
  key: string,
  topology: ReturnType<typeof topologyFor>,
): readonly Cell[] {
  const route: Cell[] = [];
  let entry = flood.get(key);
  while (entry) {
    const cell = cellFromKey(key);
    route.push(cell);
    if (entry.prev === null) break;
    key = topology.key(entry.prev);
    entry = flood.get(key);
  }
  return route.reverse();
}

/** Reachable cell keys mapped to their movement cost. */
export type ReachableMap = ReadonlyMap<string, number>;

/** Reachable cells for the selected unit's overlay (cost-aware flood). */
export function reachableCells(state: EncounterState, unitId: string): ReachableMap {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (!unit) return new Map();
  const topology = topologyFor(state.grid);
  const from: Cell = { q: unit.q, r: unit.r };
  const flood = reachable(from, unit.move, { passable: passableFor(state, unit.id), topology });
  const out = new Map<string, number>();
  for (const [key, entry] of flood) out.set(key, entry.cost);
  return out;
}
