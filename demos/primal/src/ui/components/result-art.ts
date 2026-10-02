import { t } from '../../app/i18n';
import { questById, scenarioById } from '../../content';
import type { SharedVictory } from '../../domain/victory';

export function resultArtwork(
  outcome: 'defeat' | 'victory' | null,
  number: number,
  complete: boolean,
): string | undefined {
  if (outcome === 'defeat') return '/backgrounds/bg_defeated.webp';
  if (outcome !== 'victory') return undefined;
  if (complete) return '/backgrounds/bg_final_1.webp';
  return `/backgrounds/bg_victory_${((number - 1) % 3) + 1}.webp`;
}

/** The label each victory mode carries: the overline on the poster, the hero line on the record view. */
export function victoryModeLabel(mode: SharedVictory['mode']): string {
  switch (mode) {
    case 'ascent':
      return t('victory.modeAscent');
    case 'campaign-final':
      return t('victory.modeCampaignFinal');
    case 'campaign-hunt':
      return t('victory.modeCampaignHunt');
    case 'challenge':
      return t('victory.modeChallenge');
    case 'expedition':
      return t('victory.modeExpedition');
  }
}

/** The banner art a shared victory carries: the same image its result screen showed. */
export function victoryResultArt(victory: SharedVictory): string | undefined {
  const number =
    victory.mode === 'campaign-hunt'
      ? victory.questId
        ? questById(victory.questId)?.number
        : undefined
      : victory.mode === 'expedition'
        ? victory.scenarioId
          ? scenarioById(victory.scenarioId)?.number
          : undefined
        : victory.mode === 'challenge'
          ? (victory.expeditionNumber ?? undefined)
          : (victory.chapter ?? undefined);
  return resultArtwork('victory', number ?? 1, victory.finished);
}
