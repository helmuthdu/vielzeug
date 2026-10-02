import { t } from '../../../app/i18n';
import { href } from '../../../app/router';
import { monsterById } from '../../../content';
import { encodeLoadoutCode, type SharedBuild } from '../../../domain/loadout';
import { encodeVictoryCode, type SharedVictory } from '../../../domain/victory';
import { renderBuildPoster, renderVictoryPoster } from '../../poster';

/** Every label the dialog shows, resolved once per subject so the component itself stays pure. */
export interface ShareTexts {
  copyCode: string;
  copyLink: string;
  dialogTitle: string;
  done: string;
  enlargeQr: string;
  hint: string;
  manualTitle: string;
  posterLoading: string;
  qrLabel: string;
  shareImage: string;
  shareLink: string;
  shareShowHint: string;
  shareTitle: string;
  /** The online-catalog status line; absent while the shared thing is not published. */
  status?: string;
  tapToEnlarge: string;
  whatCode: string;
  whatLink: string;
}

/** One shareable thing: the code, the link, the poster and the labels the dialog renders. */
export interface ShareSubject {
  /** Short caption under the enlarged code: the shared thing's name. */
  caption: string;
  /** The text code a player can paste manually. */
  code: string;
  /** The download and share-sheet file name. */
  fileName: string;
  /** Absolute URL the QR and the share sheet carry. */
  link: string;
  /** Renders the poster PNG; receives the dialog's hidden QR source. */
  render(qr: Element | null): Promise<Blob | null>;
  texts: ShareTexts;
}

/** QR + link for one build. The code carries card ids only, so anyone with the app can import it. */
export function buildShareSubject(input: { build: SharedBuild; published?: boolean }): ShareSubject {
  const { build } = input;
  const code = encodeLoadoutCode(build);
  return {
    caption: build.name,
    code,
    fileName: 'primal-build.png',
    link: new URL(href('loadoutImport', { code }), location.href).href,
    render: (qr) => renderBuildPoster(build, qr),
    texts: {
      copyCode: t('deck.copyCode'),
      copyLink: t('deck.copyLink'),
      dialogTitle: t('deck.shareDialogTitle'),
      done: t('deck.shareDone'),
      enlargeQr: t('deck.enlargeQr'),
      hint: t('deck.shareHint'),
      manualTitle: t('deck.shareManualTitle'),
      posterLoading: t('deck.posterLoading'),
      qrLabel: t('deck.shareQrLabel'),
      shareImage: t('deck.shareImage'),
      shareLink: t('deck.shareLink'),
      shareShowHint: t('deck.shareShowHint'),
      shareTitle: t('deck.shareTitle', { name: build.name }),
      status: input.published ? t('deck.shareOnlineStatus') : undefined,
      tapToEnlarge: t('deck.tapToEnlarge'),
      whatCode: t('deck.whatBuildCode'),
      whatLink: t('deck.whatBuildLink'),
    },
  };
}

/** QR + link for one resolved hunt record: a summary to read, not state to import. */
export function victoryShareSubject(victory: SharedVictory): ShareSubject {
  const code = encodeVictoryCode(victory);
  const caption = victory.name ?? monsterById(victory.monsterId ?? '')?.name ?? t('victory.importTitle');
  return {
    caption,
    code,
    fileName: 'primal-victory.png',
    link: new URL(href('victoryImport', { code }), location.href).href,
    render: (qr) => renderVictoryPoster(victory, qr),
    texts: {
      copyCode: t('victory.copyCode'),
      copyLink: t('victory.copyLink'),
      dialogTitle: t('victory.dialogTitle'),
      done: t('victory.done'),
      enlargeQr: t('victory.enlargeQr'),
      hint: t('victory.hint'),
      manualTitle: t('victory.manualTitle'),
      posterLoading: t('victory.posterLoading'),
      qrLabel: t('victory.qrLabel'),
      shareImage: t('victory.shareImage'),
      shareLink: t('victory.shareLink'),
      shareShowHint: t('victory.shareShowHint'),
      shareTitle: t('victory.shareTitle', { name: caption }),
      tapToEnlarge: t('victory.tapToEnlarge'),
      whatCode: t('victory.whatCode'),
      whatLink: t('victory.whatLink'),
    },
  };
}
