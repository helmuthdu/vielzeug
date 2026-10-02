import { monsterById, trialSeriesById } from '../content';
import {
  createAscent,
  duplicateAscent as duplicateAscentRecord,
  setAscentHunters,
  setAscentNightmareVariant,
} from '../domain/ascent';
import { createCampaign, duplicateCampaign as duplicateCampaignRecord } from '../domain/campaign';
import {
  challengeHunterIds,
  createChallenge,
  setChallengeHunters,
  setChallengeNightmareVariant,
} from '../domain/challenge';
import { PrimalDomainError } from '../domain/errors';
import {
  createExpedition,
  replayExpedition as replayExpeditionRecord,
  setExpeditionAggression,
  setExpeditionHunters,
  setExpeditionMonster,
  setExpeditionNightmareVariant,
  setExpeditionScenario,
  validateExpedition,
} from '../domain/expedition';
import type {
  AggressionLevel,
  Ascent,
  Campaign,
  CampaignConfig,
  Challenge,
  ExpansionId,
  Expedition,
  SubjectRef,
} from '../domain/types';
import { notify as emitNotice } from './events';
import { now, uid } from './ids';
import { expeditionLogger } from './logger';
import {
  ascentById,
  campaignById,
  challengeById,
  commitSubject,
  commitWrite,
  emitSubjectRemoved,
  expeditionById,
  isRemoteSubject,
  recordTombstone,
  SUBJECTS,
  unmountRemoteSubject,
} from './subject-state';
// ---------------------------------------------------------------------------
// Subject lifecycle: creation and deletion are local, never commands
// ---------------------------------------------------------------------------

export function startCampaign(config: CampaignConfig, hunterIds: string[]): Campaign {
  const campaign = commitSubject(
    createCampaign({ config, hunterIds, id: uid('campaign'), now: now() }),
    'campaign created',
  ) as Campaign;
  emitNotice('toasts.campaignStarted', 'success', { values: { name: campaign.name } });
  return campaign;
}

export interface ExpeditionDraft {
  aggression: AggressionLevel | null;
  expansionIds: ExpansionId[];
  hunterIds: string[];
  monsterId: string | null;
  nightmareVariant: boolean;
  scenarioId: string | null;
}

/** Persists a wizard draft as a ready expedition. Every step is validated by the domain
 *  setters. The wizard saves when its preparation step opens and again when revisited
 *  steps changed: the first save creates the record, later ones update it in place. */
export function saveExpedition(draft: ExpeditionDraft, existingId?: string): Expedition {
  const stamp = now();
  const existing = existingId ? expeditionById(existingId) : undefined;
  if (existingId && !existing) {
    throw new PrimalDomainError('expedition-unknown', 'The expedition to update no longer exists.');
  }
  let expedition = existing
    ? // The boxes can change while the wizard is open: the record takes the draft's set,
      // and every setter below re-validates party, monster, scenario and variant against it.
      {
        ...existing,
        expansionIds: ['core', ...draft.expansionIds.filter((entry) => entry !== 'core')] as ExpansionId[],
      }
    : createExpedition(uid('expedition'), draft.expansionIds, stamp);
  expedition = setExpeditionHunters(expedition, draft.hunterIds, stamp);
  if (draft.monsterId) expedition = setExpeditionMonster(expedition, draft.monsterId, stamp);
  if (draft.aggression !== null) expedition = setExpeditionAggression(expedition, draft.aggression, stamp);
  if (draft.scenarioId) expedition = setExpeditionScenario(expedition, draft.scenarioId, stamp);
  expedition = setExpeditionNightmareVariant(expedition, draft.nightmareVariant, stamp);
  const issues = validateExpedition(expedition);
  if (issues.length)
    throw new PrimalDomainError('expedition-incomplete', issues[0]?.message ?? 'The expedition is incomplete.');
  const saved = commitSubject(expedition, existing ? 'expedition updated' : 'expedition saved') as Expedition;
  expeditionLogger.info(existing ? 'Expedition updated' : 'Expedition saved', {
    monsterId: saved.monsterId,
    scenarioId: saved.scenarioId,
  });
  if (!existing) {
    emitNotice('toasts.expeditionReady', 'success', {
      values: { monster: monsterById(saved.monsterId ?? '')?.name ?? 'Expedition' },
    });
  }
  return saved;
}

export function removeSubject(ref: SubjectRef): void {
  if (isRemoteSubject(ref.id)) {
    unmountRemoteSubject(ref.id);
    emitNotice('toasts.leftSession', 'info');
    return;
  }
  const def = SUBJECTS[ref.kind];
  const subject = def.local(ref.id);
  def.drop(ref.id);
  void commitWrite(`delete ${def.table}`, (account) =>
    ref.kind === 'campaign'
      ? account.delete('campaigns', ref.id)
      : ref.kind === 'ascent'
        ? account.delete('ascents', ref.id)
        : ref.kind === 'challenge'
          ? account.delete('challenges', ref.id)
          : account.delete('expeditions', ref.id),
  );
  recordTombstone(def.table, ref.id);
  emitSubjectRemoved(ref.kind, ref.id);
  if (subject) def.notifyRemoved?.(subject);
}

/** Creates a Mount Havoc ascent with its shuffled encounter pile and opens the first chapter. */
export function startAscent(
  name: string,
  hunterIds: string[],
  expansionIds: ExpansionId[],
  nightmareVariant: boolean,
): Ascent {
  const stamp = now();
  let ascent = createAscent(uid('ascent'), name.trim() || 'Mount Havoc', expansionIds, stamp);
  ascent = setAscentNightmareVariant(ascent, nightmareVariant, stamp);
  ascent = setAscentHunters(ascent, hunterIds, stamp);
  const created = commitSubject(ascent, 'ascent created') as Ascent;
  expeditionLogger.info('Ascent created', { ascentId: created.id, hunters: hunterIds });
  emitNotice('toasts.ascentStarted', 'success', { values: { name: created.name } });
  return created;
}

export function duplicateAscent(id: string): Ascent | undefined {
  const ascent = ascentById(id);
  if (!ascent) return undefined;
  const copy = commitSubject(duplicateAscentRecord(ascent, uid('ascent'), now()), 'ascent duplicated') as Ascent;
  expeditionLogger.info('Ascent duplicated', { ascentId: copy.id, sourceAscentId: id });
  emitNotice('toasts.ascentDuplicated', 'info', { values: { name: copy.name } });
  return copy;
}

/** Creates a Winds challenge for one series and seats its party. */
export function startChallenge(
  seriesId: string,
  name: string,
  hunterIds: string[],
  expansionIds: ExpansionId[],
  nightmareVariant: boolean,
): Challenge {
  const stamp = now();
  const seriesName = trialSeriesById(seriesId)?.name ?? 'Winds';
  let run = createChallenge(uid('challenge'), seriesId, name.trim() || seriesName, expansionIds, stamp);
  run = setChallengeNightmareVariant(run, nightmareVariant, stamp);
  run = setChallengeHunters(run, hunterIds, stamp);
  const created = commitSubject(run, 'challenge created') as Challenge;
  expeditionLogger.info('Challenge created', {
    challengeId: created.id,
    hunters: hunterIds,
    seriesId,
  });
  emitNotice('toasts.challengeStarted', 'success', { values: { name: created.name } });
  return created;
}

/** Restarts the Winds series: same party and boxes, a fresh sheet with fresh drafts. */
export function restartChallenge(id: string): Challenge | undefined {
  const run = challengeById(id);
  if (!run) return undefined;
  return startChallenge(
    run.seriesId,
    '',
    challengeHunterIds(run),
    [...run.expansionIds.filter((entry) => entry !== 'core')],
    run.nightmareVariant,
  );
}

export function duplicateCampaign(id: string): Campaign | undefined {
  const campaign = campaignById(id);
  if (!campaign) return undefined;
  const copy = commitSubject(
    duplicateCampaignRecord(campaign, uid('campaign'), now()),
    'campaign duplicated',
  ) as Campaign;
  emitNotice('toasts.campaignDuplicated', 'info', { values: { name: copy.name } });
  return copy;
}

/** Plays the same quest again: a fresh expedition carrying the played one's setup: the
 *  party with its builds, target, aggression and scenario: with the fight reset. */
export function replayExpedition(id: string): Expedition | undefined {
  const expedition = expeditionById(id);
  if (!expedition) return undefined;
  const replay = commitSubject(
    replayExpeditionRecord(expedition, uid('expedition'), now()),
    'expedition replayed',
  ) as Expedition;
  expeditionLogger.info('Expedition replayed', { expeditionId: replay.id, sourceExpeditionId: id });
  emitNotice('toasts.expeditionReplayed', 'success');
  return replay;
}
