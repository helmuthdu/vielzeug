import { toast } from '@vielzeug/refine/toast';
import { onUnmounted } from 'vue';
import { t } from '../../../app/i18n';
import type { HunterCondition, HunterCounter, MonsterCounter, MonsterToken, Sector } from '../../../domain/types';

/** A single accepted board edit, expressed so it can be inverted through the same store actions. */
export type BoardChange =
  | { counter: HunterCounter; delta: number; hunterId: string; kind: 'counter'; name: string }
  | { active: boolean; condition: HunterCondition; hunterId: string; kind: 'condition'; name: string }
  | { counter: MonsterCounter; delta: number; kind: 'monster-counter'; name: string }
  | { delta: number; kind: 'monster-token'; name: string; token: MonsterToken }
  /** A removed terrain chip; the inverse re-places `count` identical chips. */
  | { count: number; kind: 'terrain-remove'; name: string; sector: Sector | null; terrainId: string }
  /** Only produced by inversion: re-places removed chips. Never recorded directly. */
  | { count: number; kind: 'terrain-restore'; name: string; sector: Sector | null; terrainId: string };

/** The removal variant, for call sites that record terrain undos. */
export type TerrainRemoval = Extract<BoardChange, { kind: 'terrain-remove' }>;

export const BOARD_UNDO_MS = 5000;

const signed = (delta: number): string => `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;

export const describeBoardChange = (change: BoardChange): string => {
  if (change.kind === 'condition') return `${change.name} ${change.active ? 'on' : 'off'}`;
  if (change.kind === 'terrain-remove' || change.kind === 'terrain-restore')
    return `${t('monsterBoard.terrainRemoved', { name: change.name })}${change.count > 1 ? ` ×${change.count}` : ''}`;
  return `${change.name} ${signed(change.delta)}`;
};

export const invertBoardChange = (change: BoardChange): BoardChange =>
  change.kind === 'condition'
    ? { ...change, active: !change.active }
    : change.kind === 'terrain-remove'
      ? { ...change, kind: 'terrain-restore' }
      : change.kind === 'terrain-restore'
        ? { ...change, kind: 'terrain-remove' }
        : { ...change, delta: -change.delta };

/** Identity of the track a change touches; changes with equal keys coalesce. */
const changeKey = (change: BoardChange): string => {
  switch (change.kind) {
    case 'counter':
      return `counter:${change.hunterId}:${change.counter}`;
    case 'condition':
      return `condition:${change.hunterId}:${change.condition}`;
    case 'monster-counter':
      return `monster-counter:${change.counter}`;
    case 'monster-token':
      return `monster-token:${change.token}`;
    case 'terrain-remove':
    case 'terrain-restore':
      return `terrain:${change.terrainId}:${change.sector}`;
  }
};

/** The terrain change kinds: never coalesced into the delta arithmetic. */
const isTerrainChange = (change: BoardChange): change is BoardChange & { kind: 'terrain-remove' | 'terrain-restore' } =>
  change.kind === 'terrain-remove' || change.kind === 'terrain-restore';

/**
 * Folds `next` into `last` when both touch the same track. Returns `null` when the pair cancels
 * out (a toggle flipped back, or +2 followed by −2). Terrain removals stack by count: removing
 * a second identical chip makes one undo that re-places both.
 */
export const coalesceBoardChanges = (last: BoardChange | null, next: BoardChange): BoardChange | null => {
  if (!last || changeKey(last) !== changeKey(next)) return next;
  if (last.kind === 'condition' && next.kind === 'condition') return last.active === next.active ? next : null;
  if (last.kind === 'condition' || next.kind === 'condition') return next;
  if (last.kind === 'terrain-remove' && next.kind === 'terrain-remove')
    return { ...next, count: last.count + next.count };
  if (isTerrainChange(last) || isTerrainChange(next)) return next;
  const delta = last.delta + next.delta;
  return delta === 0 ? null : { ...next, delta };
};

/**
 * One-level undo for the fight boards. Consecutive edits to the same track are coalesced
 * (a held `+` from 3 to 8 undoes back to 3), and the toast is local to this device: it
 * deliberately bypasses the `notify` bus so the host never relays tally chatter to guests.
 */
export function useBoardUndo(apply: (change: BoardChange) => void) {
  let toastId: string | null = null;
  let last: BoardChange | null = null;

  const drop = (): void => {
    const id = toastId;
    toastId = null;
    last = null;
    if (id) toast.dismiss(id);
  };

  const undo = (): void => {
    if (!last) return;
    const change = last;
    drop();
    apply(invertBoardChange(change));
  };

  const record = (next: BoardChange): void => {
    const merged = coalesceBoardChanges(last, next);
    if (!merged) {
      drop();
      return;
    }
    last = merged;
    const message = describeBoardChange(merged);
    if (toastId) {
      toast.update(toastId, { duration: BOARD_UNDO_MS, message });
      return;
    }
    // Dismissing through the toast's × clears the undo offer without applying it: the
    // change stays; only the Undo button reverts it. `onDismiss` resets either way.
    toastId = toast.add({
      actions: [{ label: 'Undo', onClick: undo }],
      duration: BOARD_UNDO_MS,
      horizontal: true,
      message,
      onDismiss: () => {
        toastId = null;
        last = null;
      },
      snackbar: true,
    });
  };

  onUnmounted(drop);

  return { drop, record, undo };
}
