import { RefineError } from '../errors';
import type { IconDefinition, IconElement } from './definition';
import { SVG_NS, validateIcon } from './svg';

export type IconifyTransform = {
  readonly rotate?: number;
  readonly hFlip?: boolean;
  readonly vFlip?: boolean;
};
export type IconifyIcon = IconifyTransform & {
  readonly body: string;
  readonly left?: number;
  readonly top?: number;
  readonly width?: number;
  readonly height?: number;
};
export type IconifyAlias = IconifyTransform & {
  readonly parent: string;
  readonly left?: number;
  readonly top?: number;
  readonly width?: number;
  readonly height?: number;
};
export type IconifyCollection = {
  readonly prefix?: string;
  readonly width?: number;
  readonly height?: number;
  readonly left?: number;
  readonly top?: number;
  readonly icons: Readonly<Record<string, IconifyIcon>>;
  readonly aliases?: Readonly<Record<string, IconifyAlias>>;
};

/** Convert trusted local Iconify data using the browser DOMParser, never HTML injection. */
export function iconifyIcon(data: IconifyIcon): IconDefinition {
  if (!data || typeof data !== 'object') throw new RefineError('Invalid Iconify icon');
  const { left = 0, top = 0, width = 16, height = 16 } = data;
  if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new RefineError('Invalid Iconify geometry');
  }
  if (typeof data.body !== 'string' || /<!|<\?/.test(data.body)) throw new RefineError('Invalid Iconify SVG body');
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink">${data.body}</svg>`,
    'image/svg+xml',
  );
  if (doc.querySelector('parsererror')) throw new RefineError('Malformed Iconify SVG body');
  for (const node of doc.documentElement.childNodes) {
    if (node.nodeType !== 1 && node.nodeType !== 8 && node.textContent?.trim()) {
      throw new RefineError('SVG text is not supported in icon data');
    }
  }
  const parse = (element: Element): IconElement => {
    if (element.namespaceURI !== SVG_NS) throw new RefineError('Unsupported SVG namespace');
    for (const node of element.childNodes) {
      if (node.nodeType !== 1 && node.nodeType !== 8 && node.textContent?.trim()) {
        throw new RefineError('SVG text is not supported in icon data');
      }
    }
    return {
      // Provider classes are metadata, not portable SVG presentation.
      attrs: Object.fromEntries(
        [...element.attributes].filter((attr) => attr.name !== 'class').map((attr) => [attr.name, attr.value]),
      ),
      children: [...element.children].map(parse),
      tag: element.localName,
    };
  };
  let children: readonly IconElement[] = [...doc.documentElement.children].map(parse);
  const { rotate = 0, hFlip = false, vFlip = false } = data;
  if (!Number.isInteger(rotate) || typeof hFlip !== 'boolean' || typeof vFlip !== 'boolean') {
    throw new RefineError('Invalid Iconify transform');
  }
  let x = left;
  let y = top;
  const transforms: string[] = [];
  const turn = (((rotate + (hFlip && vFlip ? 2 : 0)) % 4) + 4) % 4;
  // Iconify applies flips before rotation and normalizes the origin for a single flip.
  if (hFlip !== vFlip) {
    transforms.push(hFlip ? `translate(${width + x} ${-y}) scale(-1 1)` : `translate(${-x} ${height + y}) scale(1 -1)`);
    x = y = 0;
  }
  if (turn === 1) transforms.unshift(`rotate(90 ${height / 2 + y} ${height / 2 + y})`);
  if (turn === 2) transforms.unshift(`rotate(180 ${width / 2 + x} ${height / 2 + y})`);
  if (turn === 3) transforms.unshift(`rotate(-90 ${width / 2 + x} ${width / 2 + x})`);
  if (transforms.length) {
    children = [
      {
        attrs: { transform: transforms.join(' ') },
        children,
        tag: 'g',
      },
    ];
  }
  const icon: IconDefinition = {
    children,
    presentation: { fill: 'currentColor' },
    viewBox: turn % 2 ? [y, x, height, width] : [x, y, width, height],
  };
  validateIcon(icon);
  return icon;
}

/** Convert selected names (including aliases), or the entire explicitly imported collection. */
export function iconifyIcons(collection: IconifyCollection, names?: readonly string[]): Record<string, IconDefinition> {
  if (!collection || typeof collection.icons !== 'object' || !collection.icons || Array.isArray(collection.icons)) {
    throw new RefineError('Invalid Iconify collection');
  }
  const resolve = (name: string, seen = new Set<string>()): IconifyIcon => {
    if (seen.has(name)) throw new RefineError(`Cyclic Iconify alias: ${name}`);
    seen.add(name);
    const icon = Object.hasOwn(collection.icons, name) ? collection.icons[name] : undefined;
    if (icon) return { ...collection, ...icon };
    const alias = collection.aliases && Object.hasOwn(collection.aliases, name) ? collection.aliases[name] : undefined;
    if (!alias) throw new RefineError(`Unknown Iconify icon: ${name}`);
    if (
      (alias.rotate !== undefined && !Number.isInteger(alias.rotate)) ||
      (alias.hFlip !== undefined && typeof alias.hFlip !== 'boolean') ||
      (alias.vFlip !== undefined && typeof alias.vFlip !== 'boolean')
    )
      throw new RefineError(`Invalid Iconify alias transform: ${name}`);
    const parent = resolve(alias.parent, seen);
    return {
      ...parent,
      ...alias,
      hFlip: !!parent.hFlip !== !!alias.hFlip,
      rotate: (parent.rotate ?? 0) + (alias.rotate ?? 0),
      vFlip: !!parent.vFlip !== !!alias.vFlip,
    };
  };
  return Object.fromEntries(
    (names ?? [...Object.keys(collection.icons), ...Object.keys(collection.aliases ?? {})]).map((name) => [
      collection.prefix ? `${collection.prefix}:${name}` : name,
      iconifyIcon(resolve(name)),
    ]),
  );
}
