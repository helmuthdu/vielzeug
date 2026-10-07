import { t } from '../../app/i18n';
import { trialSeriesById } from '../../content';
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

/** The banner art a shared victory carries: the game mode's own background, so a poster
 *  reads as the game it came from. The Winds carry their series cover; only the campaign's
 *  closing record keeps the final art. */
export function victoryResultArt(victory: SharedVictory): string {
  switch (victory.mode) {
    case 'ascent':
      return '/backgrounds/bg_mount_havoc_2.webp';
    case 'campaign-final':
      return '/backgrounds/bg_final_1.webp';
    case 'campaign-hunt':
      return '/backgrounds/bg_campaign.webp';
    case 'challenge':
      return trialSeriesById(victory.seriesId ?? '')?.art ?? '/backgrounds/bg_challenges.webp';
    case 'expedition':
      return '/backgrounds/bg_expedition.webp';
  }
}
