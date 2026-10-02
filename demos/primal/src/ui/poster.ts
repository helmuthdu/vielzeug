import { asset } from '../app/assets';
import { formatDuration } from '../app/format';
import { t } from '../app/i18n';
import {
  finalBattle,
  forgeById,
  hunterById,
  hunterCards,
  monsterById,
  potionById,
  questById,
  scenarioById,
  trialSeriesById,
  weaponClassById,
} from '../content';
import { DECK_TYPES, type DeckType, deckTypeOf } from '../domain/deck';
import type { SharedBuild } from '../domain/loadout';
import type { EquipmentSlot } from '../domain/types';
import { type SharedVictory, victoryRank } from '../domain/victory';
import { victoryModeLabel, victoryResultArt } from './components/result-art';

/**
 * Renders shareable posters onto an offscreen canvas using only the 2D API: no charting
 * or image library. Colours and fonts come from the live theme so the poster matches the app, and the
 * QR is rasterised from the SVG the on-screen `ore-qr-code` already rendered (its CSS variables are
 * resolved to concrete colours first, since a canvas cannot evaluate them).
 */
const WIDTH = 1080;
const HEIGHT = 1600;
const POSTER_SLOTS: readonly EquipmentSlot[] = ['weapon', 'helm', 'armor', 'item'];

/**
 * Where each hunter's head sits in their artwork, as 0-1 fractions, so the wide banner crops the face
 * instead of the torso. The scans are composed differently, so a single centre crop loses some of them.
 */
const HEAD_FOCUS: Record<string, { x: number; y: number }> = {
  daeron: { x: 0.34, y: 0.35 },
  drusk: { x: 0.5, y: 0.27 },
  heleren: { x: 0.3, y: 0.13 },
  karah: { x: 0.55, y: 0.28 },
  ljonar: { x: 0.5, y: 0.28 },
  mirah: { x: 0.58, y: 0.37 },
  thoreg: { x: 0.45, y: 0.27 },
  zaraya: { x: 0.28, y: 0.15 },
};

/**
 * Resolve a theme colour token to a concrete rgb string. Custom-property values such as
 * `light-dark(...)` or `var(...)` are returned verbatim by `getPropertyValue` and a canvas cannot parse
 * them, so the token is applied to a throwaway element and read back as a used colour.
 */
const colorProbe = document.createElement('span');
colorProbe.style.display = 'none';
function readColor(name: string, fallback: string): string {
  colorProbe.style.color = `var(${name}, ${fallback})`;
  document.body.append(colorProbe);
  const color = getComputedStyle(colorProbe).color;
  colorProbe.remove();
  return color || fallback;
}

/** Font stacks are plain strings a canvas font shorthand accepts, so they read straight off the root. */
const readFont = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'sans-serif';

/** Resolve the CSS colours the QR svg leans on, since a rasterised image cannot read `var()`. */
function resolveQrColors(): { dark: string; light: string } {
  const probe = document.createElement('span');
  probe.style.color = 'var(--_dark, black)';
  probe.style.background = 'var(--_light, white)';
  probe.style.display = 'none';
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const colors = { dark: style.color, light: style.backgroundColor };
  probe.remove();
  return colors;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/**
 * Load the brand logo and recolour its fills to `tint`, so it stays legible on any poster background.
 * The shipped SVG hard-codes a dark-brown fill, which would vanish on the dark theme's panel.
 */
async function loadLogo(tint: string): Promise<HTMLImageElement | null> {
  try {
    const markup = await (await fetch(asset('/primal_logo.svg'))).text();
    const recolored = markup
      .replace(/fill:#5a3823/g, `fill:${tint}`)
      .replace(/fill:url\(#linearGradient\d+\)/g, `fill:${tint}`)
      .replace(/stop-color:#241e1a/g, `stop-color:${tint}`)
      .replace(/stop-color:#864e2b/g, `stop-color:${tint}`);
    return await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(recolored)}`);
  } catch {
    return null;
  }
}

/** Turn the rendered QR svg into a drawable image, swapping its CSS-variable fills for real colours. */
async function loadQr(qrElement: Element | null): Promise<HTMLImageElement | null> {
  const svg = qrElement?.shadowRoot?.querySelector('[part="svg"] svg') ?? null;
  if (!svg) return null;
  const { dark, light } = resolveQrColors();
  const markup = new XMLSerializer()
    .serializeToString(svg)
    .replaceAll('var(--_dark)', dark)
    .replaceAll('var(--_light)', light);
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draw `image` cropped to fill the (x, y, w, h) box, clipped to a rounded rectangle. `focus` is the
 * point of the source (as 0-1 fractions) to keep centred; the crop is clamped so it never pans past
 * the image edge. Defaults to the middle.
 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  focus = { x: 0.5, y: 0.5 },
): void {
  const scale = Math.max(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  const dx = Math.min(0, Math.max(w - dw, w / 2 - focus.x * dw));
  const dy = Math.min(0, Math.max(h - dh, h / 2 - focus.y * dh));
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(image, x + dx, y + dy, dw, dh);
  ctx.restore();
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  line: string,
  sunken: string,
): void {
  ctx.save();
  ctx.fillStyle = sunken;
  ctx.strokeStyle = line;
  ctx.setLineDash([8, 8]);
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A filled pill with centred text, mirroring the app's solid deck-composition chips. Returns its width. */
function drawChip(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  font: string,
  padX: number,
  height: number,
): number {
  ctx.font = font;
  const width = ctx.measureText(label).width + padX * 2;
  ctx.fillStyle = color;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + padX, y + height / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  return width;
}

/** Small uppercase section label, matching the overlines used across the app. */
function drawOverline(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  font: string,
): void {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.fillText(label.toUpperCase(), x, y);
}

/**
 * Compose the poster and resolve it as a PNG blob. `qrElement` is the on-screen `ore-qr-code`, whose
 * shadow SVG carries the same link the dialog shows.
 */
export async function renderBuildPoster(build: SharedBuild, qrElement: Element | null): Promise<Blob | null> {
  const hunter = hunterById(build.hunterId);
  if (!hunter) return null;
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const panel = readColor('--p-panel', '#ffffff');
  const sunken = readColor('--p-panel-sunken', '#f5f5f5');
  const gold = readColor('--p-gold', '#b8912f');
  const line = readColor('--p-line', '#d9d9d9');
  const strong = readColor('--p-text-strong', '#111111');
  const muted = readColor('--p-text-muted', '#666666');
  const typeColor: Record<DeckType, string> = {
    attack: readColor('--color-error', '#c0392b'),
    dodge: readColor('--color-success', '#2e8b57'),
    maneuver: readColor('--color-info', '#2c6fbb'),
    parry: readColor('--color-warning', '#c87f0a'),
  };

  const [hunterArt, qr, logo] = await Promise.all([
    loadImage(asset(hunter.artwork)),
    loadQr(qrElement),
    loadLogo(gold),
  ]);

  ctx.fillStyle = panel;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const margin = 72;
  const inner = WIDTH - margin * 2;
  const gap = 22;
  const overlineFont = `600 26px ${readFont('--font-heading')}`;

  // Hunter banner across the top, cropped around the hunter's head.
  const bannerH = 248;
  if (hunterArt) drawCover(ctx, hunterArt, margin, margin, inner, bannerH, 28, HEAD_FOCUS[hunter.id]);
  else drawPlaceholder(ctx, margin, margin, inner, bannerH, 28, line, sunken);
  ctx.strokeStyle = gold;
  roundRect(ctx, margin, margin, inner, bannerH, 28);
  ctx.lineWidth = 3;
  ctx.stroke();

  // Title block under the banner.
  ctx.textBaseline = 'alphabetic';
  let cursor = margin + bannerH + 64;
  ctx.fillStyle = strong;
  ctx.font = `700 64px ${readFont('--font-display')}`;
  ctx.fillText(truncate(ctx, build.name, inner), margin, cursor);
  cursor += 46;
  ctx.fillStyle = muted;
  ctx.font = `600 30px ${readFont('--font-heading')}`;
  // Tracked uppercase eyebrow, matching the app's overline style (canvas letterSpacing: modern browsers).
  ctx.letterSpacing = '3px';
  ctx.fillText(`${hunter.name} · ${weaponClassById(hunter.classId).name}`.toUpperCase(), margin, cursor);
  ctx.letterSpacing = '0px';

  // The hunter's loadout: the weapon spans both rows on the left: the physical board's
  // shape: with the rest of the gear and the potion loadout filling the remaining columns.
  cursor += 60;
  drawOverline(ctx, t('deck.kitTitle'), margin, cursor, muted, overlineFont);
  cursor += 26;
  const tile = Math.floor((inner - gap * 3) / 4);
  const kitImages = await Promise.all([
    ...POSTER_SLOTS.map((slot) => {
      const id = build.equipment[`${slot}Id`];
      return id ? loadImage(asset(forgeById(id)?.artwork ?? '')) : Promise.resolve(null);
    }),
    ...build.potionLoadoutIds.map((id) =>
      id ? loadImage(asset(potionById(id)?.artwork ?? '')) : Promise.resolve(null),
    ),
  ]);
  kitImages.forEach((image, index) => {
    const weapon = index === 0;
    const col = weapon ? 0 : 1 + ((index - 1) % 3);
    const row = weapon ? 0 : Math.floor((index - 1) / 3);
    const x = margin + col * (tile + gap);
    const y = cursor + row * (tile + gap);
    const h = weapon ? tile * 2 + gap : tile;
    if (image) drawCover(ctx, image, x, y, tile, h, 16);
    else drawPlaceholder(ctx, x, y, tile, h, 16, line, sunken);
  });
  cursor += tile * 2 + gap;

  // Deck composition: labelled row of solid chips, one per printed card type.
  const byId = new Map(hunterCards(hunter).map((card) => [card.id, card]));
  const counts: Record<DeckType, number> = { attack: 0, dodge: 0, maneuver: 0, parry: 0 };
  for (const id of build.deckCardIds) {
    const card = byId.get(id);
    const type = card ? deckTypeOf(card) : null;
    if (type) counts[type] += 1;
  }
  cursor += 48;
  drawOverline(ctx, t('deck.compositionTitle'), margin, cursor, muted, overlineFont);
  const totalFont = `700 30px ${readFont('--font-body')}`;
  ctx.font = totalFont;
  const totalLabel = `${build.deckCardIds.length}`;
  const totalWidth = ctx.measureText(totalLabel).width;
  ctx.fillStyle = gold;
  ctx.fillText(totalLabel, WIDTH - margin - totalWidth, cursor);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin + ctx.measureText(t('deck.compositionTitle').toUpperCase()).width + 24, cursor - 8);
  ctx.lineTo(WIDTH - margin - totalWidth - 24, cursor - 8);
  ctx.stroke();
  cursor += 26;
  const chipFont = `600 30px ${readFont('--font-body')}`;
  const chipKey: Record<DeckType, 'forge.deckAttack' | 'forge.deckDodge' | 'forge.deckManeuver' | 'forge.deckParry'> = {
    attack: 'forge.deckAttack',
    dodge: 'forge.deckDodge',
    maneuver: 'forge.deckManeuver',
    parry: 'forge.deckParry',
  };
  const chipLabels = DECK_TYPES.map((type) => t(chipKey[type], { count: counts[type] }));
  ctx.font = chipFont;
  const chipGap = 18;
  const chipWidths = chipLabels.map((label) => ctx.measureText(label).width + 26 * 2);
  const chipsTotal = chipWidths.reduce((sum, w) => sum + w, 0) + chipGap * (DECK_TYPES.length - 1);
  let chipX = margin + (inner - chipsTotal) / 2;
  chipLabels.forEach((label, index) => {
    chipX += drawChip(ctx, label, chipX, cursor, typeColor[DECK_TYPES[index]], chipFont, 26, 56) + chipGap;
  });

  // Footer: the scannable code on the right, its call-to-action on the left, joined by a rule.
  // The frame's outer edge (code + quiet zone) sits on the same margin grid as every other
  // section, so the footer reads as part of the poster instead of hanging past its edge.
  const qrSize = 296;
  const quiet = 24;
  const qrX = WIDTH - margin - qrSize;
  const qrY = HEIGHT - margin - qrSize - quiet;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, qrY - quiet - 40);
  ctx.lineTo(WIDTH - margin, qrY - quiet - 40);
  ctx.stroke();
  if (qr) {
    // A generous quiet zone: scanners on other phones read paper and screens at arm's length.
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, qrX - quiet, qrY - quiet, qrSize + quiet * 2, qrSize + quiet * 2, 20);
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    roundRect(ctx, qrX - quiet, qrY - quiet, qrSize + quiet * 2, qrSize + quiet * 2, 20);
    ctx.stroke();
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  }
  ctx.fillStyle = strong;
  ctx.font = `600 40px ${readFont('--font-heading')}`;
  ctx.fillText(truncate(ctx, build.name, qrX - quiet - margin - 40), margin, qrY + 56);
  ctx.fillStyle = muted;
  ctx.font = `500 30px ${readFont('--font-body')}`;
  ctx.fillText(truncate(ctx, t('deck.posterScanHint'), qrX - quiet - margin - 40), margin, qrY + 106);
  if (logo) {
    const logoH = 72;
    const logoW = (logo.width / logo.height) * logoH || 200;
    ctx.drawImage(logo, margin, qrY + qrSize - logoH, logoW, logoH);
  }

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

/**
 * Compose the victory poster and resolve it as a PNG blob: the mode's result art as the banner,
 * the subject's name, the party, and the stat chips the result screens show. `qrElement` is the
 * on-screen `ore-qr-code`, whose shadow SVG carries the same link the dialog shows.
 */
export async function renderVictoryPoster(victory: SharedVictory, qrElement: Element | null): Promise<Blob | null> {
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const monster = victory.monsterId ? monsterById(victory.monsterId) : undefined;
  const quest = victory.questId ? questById(victory.questId) : undefined;
  const scenario = victory.scenarioId ? scenarioById(victory.scenarioId) : undefined;
  const series = victory.seriesId ? trialSeriesById(victory.seriesId) : undefined;
  const ending = victory.endingId ? finalBattle.endings[victory.endingId] : undefined;
  /** The runs that track kills (campaigns, ascents, Winds series) show them as the trophy row. */
  const kills = victory.defeatedMonsterIds ?? [];
  const trophyRow = kills.length > 0;
  const title = victory.name ?? monster?.name ?? t('victory.importTitle');
  const eyebrow =
    victory.mode === 'campaign-hunt'
      ? (quest?.name ?? '')
      : victory.mode === 'expedition'
        ? (scenario?.name ?? '')
        : victory.mode === 'challenge'
          ? (series?.name ?? '')
          : victory.mode === 'ascent'
            ? t('victory.chapterChip', { number: victory.chapter ?? 1 })
            : (monster?.name ?? '');

  const panel = readColor('--p-panel', '#ffffff');
  const sunken = readColor('--p-panel-sunken', '#f5f5f5');
  const gold = readColor('--p-gold', '#b8912f');
  const line = readColor('--p-line', '#d9d9d9');
  const strong = readColor('--p-text-strong', '#111111');
  const muted = readColor('--p-text-muted', '#666666');
  const success = readColor('--color-success', '#2e8b57');

  const [banner, trophy, qr, logo] = await Promise.all([
    loadImage(asset(victoryResultArt(victory) ?? '')),
    loadImage(asset(monster?.trophyIcon ?? '')),
    loadQr(qrElement),
    loadLogo(gold),
  ]);

  ctx.fillStyle = panel;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const margin = 72;
  const inner = WIDTH - margin * 2;
  const gap = 22;
  const overlineFont = `600 26px ${readFont('--font-heading')}`;

  // The result's own art as the banner: the same image the result screen showed. Kill-list
  // posters also carry the trophy row under their pills, so their banner spends less height.
  const bannerH = trophyRow ? 300 : 420;
  if (banner) drawCover(ctx, banner, margin, margin, inner, bannerH, 28);
  else drawPlaceholder(ctx, margin, margin, inner, bannerH, 28, line, sunken);
  ctx.strokeStyle = gold;
  roundRect(ctx, margin, margin, inner, bannerH, 28);
  ctx.lineWidth = 3;
  ctx.stroke();

  // Title block under the banner: the mode, the subject's name, and the hunt's context.
  ctx.textBaseline = 'alphabetic';
  let cursor = margin + bannerH + 64;
  ctx.fillStyle = muted;
  ctx.font = overlineFont;
  ctx.letterSpacing = '3px';
  ctx.fillText(victoryModeLabel(victory.mode).toUpperCase(), margin, cursor);
  ctx.letterSpacing = '0px';
  // The display title's ascenders reach ~46px above their baseline, so the gap to the mode
  // label above it must clear them: 40px let the two lines' glyph boxes interlock.
  cursor += 72;
  ctx.fillStyle = strong;
  ctx.font = `700 64px ${readFont('--font-display')}`;
  const titleWidth = trophyRow ? inner : inner - 220;
  ctx.fillText(truncate(ctx, title, titleWidth), margin, cursor);
  if (eyebrow) {
    cursor += 46;
    ctx.fillStyle = muted;
    ctx.font = `600 30px ${readFont('--font-heading')}`;
    ctx.letterSpacing = '3px';
    ctx.fillText(truncate(ctx, eyebrow.toUpperCase(), titleWidth), margin, cursor);
    ctx.letterSpacing = '0px';
  }

  // The trophy emblem beside the title, mirroring the result screens' circular trophy.
  // Kill-list runs skip it: their kills read as the row below the pills, not one portrait.
  if (trophy && !trophyRow) {
    const size = 168;
    const x = WIDTH - margin - size;
    const y = margin + bannerH + 56;
    ctx.fillStyle = sunken;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, trophy, x + 10, y + 10, size - 20, size - 20, (size - 20) / 2);
    ctx.restore();
  }

  // The party: every hunter's portrait, cropped around the head like the banner crop.
  const party = victory.hunterIds.flatMap((id) => hunterById(id) ?? []);
  if (party.length > 0) {
    cursor += 64;
    drawOverline(ctx, t('victory.partyTitle'), margin, cursor, muted, overlineFont);
    cursor += 26;
    const tile = Math.min(220, Math.floor((inner - gap * (party.length - 1)) / party.length));
    const images = await Promise.all(party.map((hunter) => loadImage(asset(hunter.artwork))));
    images.forEach((image, index) => {
      const x = margin + index * (tile + gap);
      if (image) drawCover(ctx, image, x, cursor, tile, tile, 16, HEAD_FOCUS[party[index].id]);
      else drawPlaceholder(ctx, x, cursor, tile, tile, 16, line, sunken);
    });
    cursor += tile;
  }

  // The result: the stats the result screens show, as chips in the mode's own vocabulary.
  const chipFont = `600 30px ${readFont('--font-body')}`;
  const chips: { color: string; label: string }[] = [];
  const chapter = victory.chapter !== null ? t('victory.chapterChip', { number: victory.chapter }) : null;
  const duration =
    victory.durationMs !== null ? t('victory.durationChip', { duration: formatDuration(victory.durationMs) }) : null;
  const score = victory.score !== null ? t('victory.scoreChip', { score: victory.score }) : null;
  if (victory.mode === 'campaign-hunt' && chapter) chips.push({ color: gold, label: chapter });
  if (victory.mode === 'campaign-final') {
    if (ending) chips.push({ color: gold, label: ending.title });
    if (score) chips.push({ color: success, label: score });
  }
  if (victory.mode === 'expedition' && score) chips.push({ color: success, label: score });
  if (victory.mode === 'challenge') {
    if (series) chips.push({ color: gold, label: series.name });
    if (score) chips.push({ color: success, label: score });
  }
  if (victory.mode === 'ascent') {
    if (victory.finished) chips.push({ color: gold, label: t('victory.summitChip') });
    if (score) chips.push({ color: success, label: score });
  }
  const rank = victoryRank(victory);
  if (rank) chips.push({ color: gold, label: rank });
  // A rank pill already fills the row with the series/ending and the score: the fight clock
  // stays off it, keeping every mode's pills inside the margin grid.
  if (duration && !rank) chips.push({ color: gold, label: duration });
  if (chips.length > 0) {
    cursor += 48;
    drawOverline(ctx, t('victory.resultTitle'), margin, cursor, muted, overlineFont);
    cursor += 26;
    ctx.font = chipFont;
    const chipGap = 18;
    const chipWidths = chips.map((chip) => ctx.measureText(chip.label).width + 26 * 2);
    const chipsTotal = chipWidths.reduce((sum, width) => sum + width, 0) + chipGap * (chips.length - 1);
    let chipX = margin + (inner - chipsTotal) / 2;
    for (const chip of chips) {
      chipX += drawChip(ctx, chip.label, chipX, cursor, chip.color, chipFont, 26, 56) + chipGap;
    }
    cursor += 56;
  }

  // The trophies: every distinct defeated monster, one small circular portrait per kill,
  // centered in a single row under the pills. Shrinking circles keep long kill lists on it.
  if (trophyRow) {
    const defeated = kills;
    cursor += 36;
    const circleGap = 20;
    const size = Math.min(96, Math.floor((inner - circleGap * (defeated.length - 1)) / defeated.length));
    const arts = await Promise.all(defeated.map((id) => loadImage(asset(monsterById(id)?.trophyIcon ?? ''))));
    let x = margin + (inner - (defeated.length * size + circleGap * (defeated.length - 1))) / 2;
    for (const art of arts) {
      ctx.fillStyle = sunken;
      ctx.beginPath();
      ctx.arc(x + size / 2, cursor + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = gold;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (art) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, cursor + size / 2, size / 2 - 4, 0, Math.PI * 2);
        ctx.clip();
        drawCover(ctx, art, x + 4, cursor + 4, size - 8, size - 8, (size - 8) / 2);
        ctx.restore();
      }
      x += size + circleGap;
    }
    cursor += size;
  }

  // Footer: the scannable code on the right, its call-to-action on the left, joined by a rule.
  const qrSize = 296;
  const quiet = 24;
  const qrY = HEIGHT - margin - qrSize - quiet;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, qrY - quiet - 40);
  ctx.lineTo(WIDTH - margin, qrY - quiet - 40);
  ctx.stroke();
  if (qr) {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, WIDTH - margin - qrSize - quiet, qrY - quiet, qrSize + quiet * 2, qrSize + quiet * 2, 20);
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    roundRect(ctx, WIDTH - margin - qrSize - quiet, qrY - quiet, qrSize + quiet * 2, qrSize + quiet * 2, 20);
    ctx.stroke();
    ctx.drawImage(qr, WIDTH - margin - qrSize, qrY, qrSize, qrSize);
  }
  ctx.fillStyle = strong;
  ctx.font = `600 40px ${readFont('--font-heading')}`;
  ctx.fillText(truncate(ctx, title, WIDTH - margin - qrSize - quiet - margin - 40), margin, qrY + 56);
  ctx.fillStyle = muted;
  ctx.font = `500 30px ${readFont('--font-body')}`;
  ctx.fillText(
    truncate(ctx, t('victory.posterScanHint'), WIDTH - margin - qrSize - quiet - margin - 40),
    margin,
    qrY + 106,
  );
  if (logo) {
    const logoH = 72;
    const logoW = (logo.width / logo.height) * logoH || 200;
    ctx.drawImage(logo, margin, qrY + qrSize - logoH, logoW, logoH);
  }

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) clipped = clipped.slice(0, -1);
  return `${clipped}…`;
}

/** Trigger a browser download for a poster blob. Used when the Web Share API cannot take files. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
