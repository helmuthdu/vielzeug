import { createSvgElement } from './element';

/** Average glyph width relative to font size; jsdom cannot measure SVG text, so labels are estimated. */
const GLYPH_WIDTH = 0.6;

export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * GLYPH_WIDTH;
}

export function createTextElement(
  content: string,
  attrs?: Record<string, number | string | undefined>,
): SVGTextElement {
  const text = createSvgElement('text', attrs);

  text.textContent = content;

  return text;
}
