import { createSvgElement, setAttributes } from './element';

export function createTextElement(
  content: string,
  attrs?: Record<string, number | string | undefined>,
): SVGTextElement {
  const text = createSvgElement('text', attrs);

  text.textContent = content;

  return text;
}

export function truncateText(text: string, maxWidth: number, fontSize: number): string {
  const avgCharWidth = fontSize * 0.6;
  const maxChars = Math.floor(maxWidth / avgCharWidth);

  if (text.length <= maxChars) return text;

  return text.slice(0, Math.max(1, maxChars - 1)) + '…';
}

export function measureTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}

export function createAxisLabel(
  content: string,
  x: number,
  y: number,
  anchor: 'end' | 'middle' | 'start' = 'middle',
): SVGTextElement {
  return createTextElement(content, {
    'dominant-baseline': 'middle',
    'text-anchor': anchor,
    x,
    y,
  });
}

export { setAttributes };
