import { PrimalDomainError } from './errors';
import type { RunStatus } from './types';

/**
 * The operations the sudden-death run modes share: Mount Havoc's ascent and the Winds
 * challenge carry the same name rule, wound cap, and duplicate ritual: written once
 * against the run shape both satisfy, like `build.ts` does for hunter builds.
 */

/** Both run sheets cap a name at 40 characters and carried wounds at three cards. */
export const RUN_NAME_MAX = 40;
export const RUN_MAX_WOUNDS = 3;

/** Fisher–Yates with the caller's random so tests stay deterministic. The ascent's draw pile
 *  and the Winds sheet's draft pairs are the runs' only randomness, and both shuffle ids. */
export function shuffle(ids: readonly string[], random: () => number): string[] {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** The member fields the run operations touch. */
interface RunMember {
  hunterId: string;
  woundCount: number;
}

/** The subject fields the run operations touch: Ascent and Challenge both satisfy it. */
interface RunLike<M extends RunMember> {
  createdAt: string;
  hunters: readonly M[];
  id: string;
  name: string;
  rev?: number;
  status: RunStatus;
  updatedAt: string;
}

/** The name both sheets share: trimmed, 1–40 characters. Creation and rename use the same rule. */
export function runName(name: string): string {
  const nextName = name.trim();
  if (!nextName || nextName.length > RUN_NAME_MAX) {
    throw new PrimalDomainError('run-name-invalid', 'Give the run a name of 1–40 characters.');
  }
  return nextName;
}

/** The rename both sheets share: trimmed, 1–40 characters. */
export function renameRun<S extends RunLike<M>, M extends RunMember>(run: S, name: string, now: string): S {
  return { ...run, name: runName(name), updatedAt: now };
}

/** A duplicate is a fresh record: the write counter starts over at the store's first commit. */
export function duplicateRun<S extends RunLike<M>, M extends RunMember>(run: S, id: string, now: string): S {
  const { createdAt: _createdAt, id: _id, name: _name, rev: _rev, updatedAt: _updatedAt, ...rest } = run;
  return { ...rest, createdAt: now, id, name: `${run.name} (copy)`, rev: 0, updatedAt: now } as S;
}

/** Wounds are the sheet's tracker; the hunt itself is resolved on paper. */
export function setRunWoundCount<S extends RunLike<M>, M extends RunMember>(
  run: S,
  hunterId: string,
  woundCount: number,
  now: string,
): S {
  if (!Number.isInteger(woundCount) || woundCount < 0 || woundCount > RUN_MAX_WOUNDS) {
    throw new PrimalDomainError('counter-invalid', `Wounds are tracked between 0 and ${RUN_MAX_WOUNDS}.`);
  }
  if (run.status === 'finished') throw new PrimalDomainError('run-finished', 'This run has already ended.');
  if (!run.hunters.some((member) => member.hunterId === hunterId)) {
    throw new PrimalDomainError('hunter-not-found', `Hunter "${hunterId}" is not in this party.`);
  }
  return {
    ...run,
    hunters: run.hunters.map((member) => (member.hunterId === hunterId ? ({ ...member, woundCount } as M) : member)),
    updatedAt: now,
  };
}
