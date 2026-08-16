import { createSvgElement } from './element';

export function createTextElement(
  content: string,
  attrs?: Record<string, number | string | undefined>,
): SVGTextElement {
  const text = createSvgElement('text', attrs);

  text.textContent = content;

  return text;
}
