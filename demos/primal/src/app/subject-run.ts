import { equipSubjectEquipment, equipSubjectPotion, setSubjectDeck, setSubjectMastery } from '../domain/build';
import { EQUIPMENT_SLOTS } from '../domain/deck';
import type { HuntSubject, SubjectRef } from '../domain/types';
import { notify as emitNotice } from './events';
import { now } from './ids';
import { guarded } from './notices';
import {
  type CommandOutcome,
  type CommandResult,
  type SubjectCommandArgs,
  type SubjectCommandName,
  subjectCommands,
} from './subject-commands';
import {
  applyLoadoutTo,
  buildAsLoadout,
  type CommandRevert,
  type HuntMember,
  history,
  memberBuild,
  replayCommand,
  requireHistorySubject,
  revertCommand,
  showNotices,
  UNDO_ACTION,
  UNDO_CAPTURES,
} from './subject-history';
import { applyLocalCommand, commitSubject, findSubject, forwardToHost } from './subject-state';
/**
 * Runs a subject command: forwards it to the session host when the subject is a remote
 * mirror, otherwise applies it, commits it, records undo when the command is undoable, and
 * shows the notices it produced: the first carries Undo when history was recorded. Domain
 * refusals report as localized toasts and return `undefined`; anything else is a bug and
 * propagates to the app's error handler.
 */
export function runCommand<K extends SubjectCommandName>(
  name: K,
  ref: SubjectRef,
  ...args: SubjectCommandArgs<K>
): CommandResult<K> | undefined {
  if (forwardToHost(ref, name, args)) {
    return findSubject(ref) as CommandResult<K> | undefined;
  }
  const subject = findSubject(ref);
  if (!subject) return undefined;
  const command = subjectCommands[name] as (subject: HuntSubject, ...rest: unknown[]) => CommandOutcome;
  return guarded(() => {
    // The capture runs before the command executes and closes over the values it changes.
    const capture = Object.hasOwn(UNDO_CAPTURES, name)
      ? (UNDO_CAPTURES as Record<string, (subject: HuntSubject, ...args: unknown[]) => CommandRevert>)[name](
          subject,
          ...args,
        )
      : undefined;
    const { fightAction, notices, subject: next } = command(subject, ...args);
    const committed = commitSubject(next, name, fightAction);
    if (capture) {
      history.record({
        apply: () => {
          replayCommand(name, ref, args);
        },
        label: name,
        meta: { ref },
        revert: () => {
          revertCommand(ref, capture.revert);
        },
      });
    }
    showNotices(notices, Boolean(capture));
    return committed as CommandResult<K>;
  });
}

/**
 * Applies a wire command directly, bypassing session forwarding: the session host's
 * entry point. The wire carries an untyped name and args, so this is the one boundary
 * where the heterogeneous command table meets a string key.
 */
export function applySubjectCommand(name: string, ref: SubjectRef, args: readonly unknown[]): unknown {
  if (!Object.hasOwn(subjectCommands, name)) return undefined;
  return applyLocalCommand(() =>
    runCommand(name as SubjectCommandName, ref, ...(args as SubjectCommandArgs<SubjectCommandName>)),
  );
}

/**
 * Saves a hunter's whole build: deck, mastery, equipment and potions: as one commit and
 * one history entry, announced as one toast with Undo.
 */
export function saveHunterBuild(
  ref: SubjectRef,
  hunterId: string,
  build: Pick<HuntMember, 'deckCardIds' | 'equipment' | 'masteryCardId' | 'potionLoadoutIds'>,
): void {
  guarded(() => {
    const subject = findSubject(ref);
    if (!subject) return;
    const before = memberBuild(subject, hunterId);
    const stamp = now();
    // Each changed field goes through the shared domain operations; one commit carries them all.
    let next = subject;
    if (build.masteryCardId !== before.masteryCardId) {
      next = setSubjectMastery(next, hunterId, build.masteryCardId, stamp);
    }
    next = setSubjectDeck(next, hunterId, build.deckCardIds, stamp);
    for (const slot of EQUIPMENT_SLOTS) {
      if (build.equipment[`${slot}Id`] !== before.equipment[`${slot}Id`]) {
        next = equipSubjectEquipment(next, hunterId, slot, build.equipment[`${slot}Id`], stamp);
      }
    }
    for (const slot of [0, 1, 2] as const) {
      if (build.potionLoadoutIds[slot] !== before.potionLoadoutIds[slot]) {
        next = equipSubjectPotion(next, hunterId, slot, build.potionLoadoutIds[slot], stamp);
      }
    }
    commitSubject(next, 'saveBuild');
    history.record({
      apply: () => {
        commitSubject(
          applyLoadoutTo(requireHistorySubject(ref), hunterId, buildAsLoadout(hunterId, build)),
          'redo saveBuild',
        );
      },
      label: 'saveBuild',
      meta: { ref },
      revert: () => {
        revertCommand(ref, (current) => applyLoadoutTo(current, hunterId, before));
      },
    });
    emitNotice('toasts.deckSaved', 'success', { actions: [UNDO_ACTION] });
  });
}
