/**
 * The application store: public surface. The implementation lives in focused modules:
 *
 * - `subject-state`    : signals, the per-kind registry, hydration, persistence, mirrors, backups, sync
 * - `subject-commands` : the single mutation table (pure: subject in, subject + notices out)
 * - `subject-history`  : the undo/redo ledger and the field-scoped revert captures
 * - `subject-run`      : runCommand/applySubjectCommand: forwarding, commit, history, notices
 * - `subject-lifecycle`: creation, duplication and deletion (local, never commands)
 * - `loadouts`         : device-local saved builds
 * - `settings`         : the one settings write path
 * - `notices`          : notice construction and the error-toast pipeline
 *
 * Views keep importing from `./store`; the modules form a one-way chain
 * (state → commands → history → run → lifecycle) with no cycles.
 */

export {
  createLoadout,
  duplicateLoadout,
  findMatchingLoadout,
  hasUnpublishedChanges,
  importLoadout,
  loadoutById,
  loadoutsForHunter,
  publishLoadout,
  removeLoadout,
  renameLoadout,
  saveLoadout,
  setLoadoutEquipment,
  setLoadoutMastery,
  setLoadoutPotion,
  setLoadoutStrategy,
  unpublishLoadout,
  updateLoadoutBuild,
} from './loadouts';
export { notifyError } from './notices';
export type { AppLocale, HunterBoardLayout, Settings, ThemePreference } from './persistence';
export { patchSettings, resetSettings, setLanguage } from './settings';
export type { CommandOutcome, SubjectCommandArgs, SubjectCommandName } from './subject-commands';
export { subjectCommands } from './subject-commands';
export { redoLastSubjectCommand, undoLastSubjectCommand } from './subject-history';
export type { ExpeditionDraft } from './subject-lifecycle';
export {
  duplicateAscent,
  duplicateCampaign,
  removeSubject,
  replayExpedition,
  restartChallenge,
  saveExpedition,
  startAscent,
  startCampaign,
  startChallenge,
} from './subject-lifecycle';
export { applySubjectCommand, runCommand, saveHunterBuild } from './subject-run';
export {
  applyLocalCommand,
  ascentById,
  ascents,
  campaignById,
  campaigns,
  challengeById,
  challenges,
  expeditionById,
  expeditions,
  exportSavedData,
  hydratePrimalStore,
  importSavedData,
  isRemoteSubject,
  loadouts,
  mountRemoteSubject,
  recentAscents,
  recentCampaigns,
  SUBJECTS,
  type SubjectKind,
  setSessionCommandSender,
  settings,
  syncGateway,
  unmountRemoteSubject,
} from './subject-state';
