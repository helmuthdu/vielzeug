import { RefineError } from '../errors';
import type { IconAttributes, IconDefinition, IconElement } from './definition';

export const SVG_NS = 'http://www.w3.org/2000/svg';
const tags = new Set([
  'circle',
  'clipPath',
  'defs',
  'ellipse',
  'g',
  'line',
  'linearGradient',
  'mask',
  'path',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'stop',
  'symbol',
  'use',
]);
const attributes = new Set([
  'id',
  'd',
  'points',
  'x',
  'y',
  'x1',
  'x2',
  'y1',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'transform',
  'clip-path',
  'clip-rule',
  'clipPathUnits',
  'mask',
  'maskUnits',
  'maskContentUnits',
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'fx',
  'fy',
  'fr',
  'href',
  'xlink:href',
  'viewBox',
  'preserveAspectRatio',
  'vector-effect',
]);

export function validateAttributes(attrs: IconAttributes = {}): void {
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) throw new RefineError('Invalid SVG attributes');
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    if (
      !attributes.has(key) ||
      (typeof value !== 'string' && typeof value !== 'number') ||
      (typeof value === 'number' && !Number.isFinite(value))
    ) {
      throw new RefineError(`Unsupported SVG attribute: ${key}`);
    }
    const text = String(value);
    if (
      (/^(?:xlink:)?href$/.test(key) && !/^#[\w:.-]+$/.test(text)) ||
      (/url\s*\(/i.test(text) && !/^url\(#[\w:.-]+\)$/.test(text)) ||
      /(?:javascript|data|https?):/i.test(text)
    ) {
      throw new RefineError(`External SVG reference is not supported: ${key}`);
    }
  }
}

export function validateElement(node: IconElement): void {
  if (!node || typeof node !== 'object' || (node.children !== undefined && !Array.isArray(node.children))) {
    throw new RefineError('Invalid SVG element');
  }
  if (!tags.has(node.tag)) throw new RefineError(`Unsupported SVG element: ${node.tag}`);
  validateAttributes(node.attrs);
  for (const child of node.children ?? []) validateElement(child);
}

export function validateIcon(icon: IconDefinition): void {
  if (
    !icon ||
    !Array.isArray(icon.viewBox) ||
    icon.viewBox.length !== 4 ||
    !icon.viewBox.every(Number.isFinite) ||
    icon.viewBox[2] <= 0 ||
    icon.viewBox[3] <= 0 ||
    !Array.isArray(icon.children)
  )
    throw new RefineError('Invalid icon definition or viewBox');
  validateAttributes(icon.presentation);
  if (
    icon.presentation?.id !== undefined ||
    icon.presentation?.href !== undefined ||
    icon.presentation?.['xlink:href'] !== undefined
  )
    throw new RefineError('SVG ids and references belong on child elements');
  for (const child of icon.children) validateElement(child);
  const ids = new Set<string>();
  const visit = (nodes: readonly IconElement[]) => {
    for (const node of nodes) {
      if (node.attrs?.id !== undefined) {
        const id = String(node.attrs.id);
        if (!/^[\w:.-]+$/.test(id) || ids.has(id)) throw new RefineError(`Invalid or duplicate SVG id: ${id}`);
        ids.add(id);
      }
      visit(node.children ?? []);
    }
  };
  visit(icon.children);
}

/** Prefix local IDs and references per rendered instance, including nested gradients/masks. */
export function createIconChildren(icon: IconDefinition, prefix: string): SVGElement[] {
  const create = (node: IconElement): SVGElement => {
    const element = document.createElementNS(SVG_NS, node.tag);
    for (const [key, value] of Object.entries(node.attrs ?? {})) {
      if (value === undefined) continue;
      let text = String(value);
      if (key === 'id') text = `${prefix}${text}`;
      else if (/^(?:xlink:)?href$/.test(key)) text = `#${prefix}${text.slice(1)}`;
      else text = text.replace(/url\(#([\w:.-]+)\)/g, `url(#${prefix}$1)`);
      if (key === 'xlink:href') element.setAttributeNS('http://www.w3.org/1999/xlink', key, text);
      else element.setAttribute(key, text);
    }
    element.replaceChildren(...(node.children ?? []).map(create));
    return element;
  };
  return icon.children.map(create);
}
