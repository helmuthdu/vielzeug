import { enabledContent, hunters } from '../content';
import { PrimalDomainError } from './errors';
import { syncHunterState } from './hunter-state';
import type { ExpansionId, Hunter, HuntSubject } from './types';

export const PARTY_MIN = 2;
export const PARTY_MAX = 4;

/** The party's upper bound for the enabled boxes: the fifth hunter's seat comes with the
 *  Mount Havoc expansion, whatever the mode. */
export const partyMaxFor = (expansionIds: readonly ExpansionId[]): number =>
  expansionIds.includes('mount-havoc') ? 5 : PARTY_MAX;

export interface PartyIssue {
  code: 'party-size' | 'party-duplicate' | 'party-unavailable';
  message: string;
}

/** Hunters selectable for the given expansions: shared by campaign and expedition setup. */
export function availableHunters(expansionIds: readonly ExpansionId[]): Hunter[] {
  return enabledContent(hunters, expansionIds);
}

/** Party rules from the rulebook: 2–4 unique hunters from enabled boxes: five once Mount
 *  Havoc is at the table. Explicit bounds (the ascent's) still win. */
export function validateParty(
  hunterIds: readonly string[],
  expansionIds: readonly ExpansionId[],
  bounds: { max?: number; min?: number } = {},
): PartyIssue[] {
  const min = bounds.min ?? PARTY_MIN;
  const max = bounds.max ?? partyMaxFor(expansionIds);
  const issues: PartyIssue[] = [];
  if (hunterIds.length < min || hunterIds.length > max) {
    issues.push({
      code: 'party-size',
      message: `A party needs between ${min} and ${max} hunters (${hunterIds.length} selected).`,
    });
  }
  if (new Set(hunterIds).size !== hunterIds.length) {
    issues.push({ code: 'party-duplicate', message: 'Each hunter can only be chosen once.' });
  }
  const available = new Set(availableHunters(expansionIds).map((hunter) => hunter.id));
  for (const id of hunterIds) {
    if (!available.has(id)) {
      issues.push({ code: 'party-unavailable', message: `Hunter "${id}" is not part of the enabled expansions.` });
    }
  }
  return issues;
}

export function assertParty(hunterIds: readonly string[], expansionIds: readonly ExpansionId[]): void {
  const [issue] = validateParty(hunterIds, expansionIds);
  if (issue) throw new PrimalDomainError(issue.code, issue.message);
}

/**
 * The party-seat write every mode shares: hunters already in the party keep their build,
 * new ones arrive through the mode's own factory, the fight-state map follows the roster,
 * and a roster change clears the in-progress fight timeline. Phase gating, party bounds and
 * any extra board resync stay with the calling mode: they genuinely differ.
 * Like `setPlayerName`, the cast only restores the kind↔member-array correlation the spread
 * cannot express.
 */
export function seatParty<S extends HuntSubject, M extends { hunterId: string }>(
  subject: S & { hunters: readonly M[] },
  hunterIds: readonly string[],
  createMember: (hunterId: string) => M,
  now: string,
): S {
  const partyChanged =
    hunterIds.length !== subject.hunters.length ||
    hunterIds.some((id) => !subject.hunters.some((member) => member.hunterId === id));
  const hunters = hunterIds.map(
    (hunterId) => subject.hunters.find((member) => member.hunterId === hunterId) ?? createMember(hunterId),
  );
  return {
    ...subject,
    fightEvents: partyChanged ? [] : subject.fightEvents,
    fightStart: partyChanged ? null : subject.fightStart,
    hunterState: syncHunterState(hunterIds, subject.hunterState),
    hunters,
    updatedAt: now,
  } as S;
}

const withPlayerName = <T extends { hunterId: string; playerName: string }>(
  members: readonly T[],
  hunterId: string,
  playerName: string,
): T[] => members.map((member) => (member.hunterId === hunterId ? { ...member, playerName } : member));

/** Every mode's member carries the same player-name field, so one generic write serves all
 *  four; the cast only restores the kind↔member-array correlation the spread cannot express. */
export function setPlayerName<S extends HuntSubject>(subject: S, hunterId: string, name: string, now: string): S {
  const member = subject.hunters.find((entry) => entry.hunterId === hunterId);
  if (!member) throw new PrimalDomainError('hunter-not-found', `Hunter "${hunterId}" is not in this party.`);
  const playerName = name.trim().slice(0, 24);
  if (member.playerName === playerName) return subject;
  return { ...subject, hunters: withPlayerName(subject.hunters, hunterId, playerName), updatedAt: now } as S;
}

/** Toggles a hunter in a selection while respecting the party maximum. Returns the unchanged list when full. */
export function toggleHunter(selected: readonly string[], hunterId: string, max: number = PARTY_MAX): string[] {
  if (selected.includes(hunterId)) return selected.filter((id) => id !== hunterId);
  if (selected.length >= max) return [...selected];
  return [...selected, hunterId];
}
