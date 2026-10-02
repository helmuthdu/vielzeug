import { cardTokenIcons, coloredCardTokens, gameIconArt } from '../../content';

export interface ReferenceIconToken {
  colored?: string;
  icon?: string;
  kind?: 'icon';
  label?: string;
}

/** Replaces recognized bracketed rulebook icon names with their printed glyphs. */
export function splitIconTokens(text: string): Array<string | ReferenceIconToken> {
  const segments: Array<string | ReferenceIconToken> = [];
  const pattern = /\[([A-Za-z][A-Za-z -]*)\]/g;
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const label = match[1];
    if (!label) continue;
    const key = label.toLowerCase().replace(/ /g, '-');
    const colored = coloredCardTokens[key];
    const icon = colored ? undefined : (gameIconArt[key] ?? cardTokenIcons[key]);
    if (!colored && !icon) continue;
    const start = match.index ?? 0;
    if (start > cursor) segments.push(text.slice(cursor, start));
    segments.push({ ...(colored ? { colored } : {}), ...(icon ? { icon } : {}), kind: 'icon', label });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) segments.push(text.slice(cursor));
  return segments;
}
