import type { MessageKey } from '../app/i18n';

/**
 * Corner announcements: campaign cards framed exactly like the music video
 * window (see use-youtube-audio.ts), rendered by PromoBanner next to or above
 * that window. Add an entry here to run a new promo; dismissed ids are
 * remembered per device, so ids must stay stable across releases.
 */
export interface Promo {
  height: number;
  /** Stable id: doubles as the dismissal key stored on the device. */
  id: string;
  /** Public asset path of the campaign art. */
  image: string;
  /** Locale key naming the promo: the link's aria-label and the image alt. */
  titleKey: MessageKey;
  /** The page the card opens in a new tab. */
  url: string;
  /** Intrinsic art size in px: reserves the card's layout box before load. */
  width: number;
}

/** The active promos, newest first. */
export const PROMOS: readonly Promo[] = [
  {
    height: 807,
    id: 'primal-legends',
    image: '/backgrounds/bg_primal_legends.webp',
    titleKey: 'promo.legends.title',
    url: 'https://reggiegames.com/pages/the-game',
    width: 1920,
  },
];
