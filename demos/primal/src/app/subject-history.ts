import { createLedger } from '@vielzeug/ledger';
import { setAscentWoundCount } from '../domain/ascent';
import { applySubjectLoadout } from '../domain/build';
import { tradeHunterResources } from '../domain/campaign';
import { setChallengeWoundCount } from '../domain/challenge';
import { PrimalDomainError } from '../domain/errors';
import type { AppliedBuild, HuntSubject, ResourceId, SubjectRef } from '../domain/types';
import { isAscentSubject } from '../domain/types';
import { notify as emitNotice, type Notice, type NotifyAction } from './events';
import { now } from './ids';
import {
  type CommandArgs,
  type CommandOutcome,
  requireCampaign,
  requireChallenge,
  type SubjectCommandName,
  subjectCommands,
} from './subject-commands';
import { commitSubject, findSubject, isRemoteSubject } from './subject-state';
// ---------------------------------------------------------------------------
// Undo history: two tiers of taking a move back:
// - Board undo (ui/components/board/useBoardUndo): a five-second toast coalescing repeat
//   counter and token taps on the boards.
// - This ledger: the structural commands (crafts, trades, hunt results, build saves), 24
//   entries deep, reachable from the command's own toast and from Ctrl/Cmd+Z.
// Reverts are field-scoped (the values the command changed), so undo stays safe while later
// commands touch other hunters; only the hunt result restores a whole-subject snapshot,
// guarded by the subject's rev: the write counter counts every committed write, local or
// from another tab, so a moved-on subject refuses the undo.
// ---------------------------------------------------------------------------

export type HuntMember = HuntSubject['hunters'][number];

/** History meta: the subject an entry belongs to, re-resolved at undo and redo time. */
interface HistoryMeta {
  ref: SubjectRef;
}

export const history = createLedger<HistoryMeta>({ maxHistory: 24 });

/** Takes a command's effect back on the current subject; throws when the subject moved on. */
export interface CommandRevert {
  revert: (current: HuntSubject) => HuntSubject;
}

/** Reads one hunter's build fields as a build value so reverts can re-apply them. */
export function memberBuild(subject: HuntSubject, hunterId: string): AppliedBuild {
  const member = subject.hunters.find((entry) => entry.hunterId === hunterId);
  if (!member) throw new PrimalDomainError('hunter-not-found', 'That hunter is not part of this hunt.');
  return buildAsLoadout(hunterId, member);
}

export function buildAsLoadout(
  hunterId: string,
  build: Pick<HuntMember, 'deckCardIds' | 'equipment' | 'masteryCardId' | 'potionLoadoutIds'>,
): AppliedBuild {
  return { ...build, hunterId };
}

/** Applies a loadout through the shared build operation: used by command and revert. */
export function applyLoadoutTo(subject: HuntSubject, hunterId: string, loadout: AppliedBuild): HuntSubject {
  return applySubjectLoadout(subject, hunterId, loadout, now());
}

/** Restores one hunter's member record: the field-scoped snapshot for member-touching commands. */
export function captureMemberRevert(subject: HuntSubject, hunterId: string): CommandRevert {
  const member = subject.hunters.find((entry) => entry.hunterId === hunterId);
  if (!member) throw new PrimalDomainError('hunter-not-found', 'That hunter is not part of this hunt.');
  return {
    revert: (current) => replaceMember(current, hunterId, member),
  };
}

/** The captured member belongs to this subject, so its kind always matches at runtime. */
function replaceMember<T extends HuntSubject>(subject: T, hunterId: string, member: HuntMember): T {
  return {
    ...subject,
    hunters: subject.hunters.map((entry) => (entry.hunterId === hunterId ? member : entry)),
  } as T;
}

/**
 * How each undoable command is taken back. Every capture runs before the command executes
 * and closes over the values the command is about to change. The map's own keys name the
 * undoable commands: adding an entry is all it takes, and a renamed command loses its
 * capture here at compile time instead of silently stopping being undoable.
 */
export const UNDO_CAPTURES = {
  applyLoadout: (subject: HuntSubject, hunterId: string): CommandRevert => {
    const before = memberBuild(subject, hunterId);
    return { revert: (current) => applyLoadoutTo(current, hunterId, before) };
  },
  consumePotion: (subject: HuntSubject, hunterId: string): CommandRevert => captureMemberRevert(subject, hunterId),
  craftCampaignEquipment: (subject: HuntSubject, hunterId: string): CommandRevert =>
    captureMemberRevert(subject, hunterId),
  prepareCampaignPotion: (subject: HuntSubject, hunterId: string): CommandRevert =>
    captureMemberRevert(subject, hunterId),
  recordHuntResult: (subject: HuntSubject): CommandRevert => {
    const before = subject;
    const revBefore = before.rev;
    return {
      // The hunt result rewrites the whole campaign, so its revert restores the snapshot :
      // but only while the command's own commit is the last write to the subject.
      revert: (current) => {
        if (current.rev !== revBefore + 1) {
          throw new PrimalDomainError('undo-unavailable', 'The campaign changed since the result was recorded.');
        }
        // The snapshot restores the content; the write counter carries on from the current record.
        return { ...before, rev: current.rev };
      },
    };
  },
  setSubjectWounds: (subject: HuntSubject, hunterId: string): CommandRevert => {
    // The command only succeeds on a sudden-death run, so the capture reads it as one.
    const run = isAscentSubject(subject) ? subject : requireChallenge(subject);
    const before = run.hunters.find((entry) => entry.hunterId === hunterId)?.woundCount ?? 0;
    return {
      revert: (current) =>
        isAscentSubject(current)
          ? setAscentWoundCount(current, hunterId, before, now())
          : setChallengeWoundCount(requireChallenge(current), hunterId, before, now()),
    };
  },
  spendSkillPoint: (subject: HuntSubject, hunterId: string): CommandRevert => captureMemberRevert(subject, hunterId),
  tradeHunterResources: (
    _subject: HuntSubject,
    fromHunterId: string,
    toHunterId: string,
    offeredResourceId: ResourceId,
    requestedResourceId: ResourceId,
  ): CommandRevert => ({
    // The reverse trade hands back what each side received: from offers the requested resource.
    revert: (current) =>
      tradeHunterResources(
        requireCampaign(current),
        fromHunterId,
        toHunterId,
        requestedResourceId,
        offeredResourceId,
        now(),
      ),
  }),
} satisfies Partial<{
  [K in SubjectCommandName]: (subject: HuntSubject, ...args: CommandArgs<K>) => CommandRevert;
}>;

/** The commands players expect to take back: exactly the capture table's keys. */
export type UndoableCommandName = keyof typeof UNDO_CAPTURES;

/** History bodies resolve the subject at run time; a missing subject fails the action politely. */
export function requireHistorySubject(ref: SubjectRef): HuntSubject {
  const current = findSubject(ref);
  if (!current) throw new PrimalDomainError('undo-unavailable', 'That hunt is no longer open.');
  return current;
}

/** Re-runs a command as a history redo: through the same wrappers, so it announces itself. */
export function replayCommand(name: SubjectCommandName, ref: SubjectRef, args: readonly unknown[]): HuntSubject {
  const command = subjectCommands[name] as (subject: HuntSubject, ...rest: unknown[]) => CommandOutcome;
  const before = requireHistorySubject(ref);
  const { fightAction, notices, subject } = command(before, ...args);
  showNotices(notices, false);
  return commitSubject(subject, `redo ${name}`, fightAction);
}

/** Applies a capture's revert through the single write path. */
export function revertCommand(ref: SubjectRef, revert: (current: HuntSubject) => HuntSubject): HuntSubject {
  return commitSubject(revert(requireHistorySubject(ref)), 'undo');
}

/** Undoes the most recent recorded command; the confirmation toast offers Redo when one exists. */
export function undoLastSubjectCommand(): void {
  const top = history.state.getSnapshot().undo.at(-1);
  if (!top?.meta || isRemoteSubject(top.meta.ref.id)) return;
  history
    .undo()
    .then(() => {
      const redo = history.state.getSnapshot().redo.length > 0;
      emitNotice('toasts.undone', 'info', {
        actions: redo ? [{ key: 'toasts.redo', onClick: redoLastSubjectCommand }] : undefined,
      });
    })
    .catch(() => emitNotice('toasts.undoUnavailable', 'warning'));
}

/** Re-applies the most recently undone command; the toast offers Undo again when one exists. */
export function redoLastSubjectCommand(): void {
  history
    .redo()
    .then(() => {
      const undo = history.state.getSnapshot().undo.length > 0;
      emitNotice('toasts.redone', 'info', { actions: undo ? [UNDO_ACTION] : undefined });
    })
    .catch(() => emitNotice('toasts.undoUnavailable', 'warning'));
}

export const UNDO_ACTION: NotifyAction = { key: 'toasts.undo', onClick: undoLastSubjectCommand };

/** Shows a command's notices; the first carries Undo when the command recorded history. */
export function showNotices(entries: readonly Notice[], undoable: boolean): void {
  for (const [index, entry] of entries.entries()) {
    emitNotice(entry.key, entry.variant, {
      actions: index === 0 && undoable ? [UNDO_ACTION] : undefined,
      count: entry.count,
      values: entry.values,
    });
  }
}
