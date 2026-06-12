const SVG_NS = 'http://www.w3.org/2000/svg';

export function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Record<string, number | string | undefined>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);

  if (attrs) setAttributes(el, attrs);

  return el;
}

export function setAttributes(el: SVGElement, attrs: Record<string, number | string | undefined>): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

export function removeChildren(el: SVGElement): void {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}
