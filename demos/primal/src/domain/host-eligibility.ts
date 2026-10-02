import { huntersTrialCampaignOver } from './campaign';
import type { HuntSubject } from './types';

export function canHostSubject(subject: HuntSubject): boolean {
  if (subject.kind === 'campaign') return !subject.finalBattleWon && !huntersTrialCampaignOver(subject);
  if (subject.kind === 'expedition') return subject.status !== 'played';
  return subject.status !== 'finished';
}
