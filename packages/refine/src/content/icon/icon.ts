import { define, html, prop, ref, bind, watchEffect } from '@vielzeug/ore';
import { when } from '@vielzeug/ore/directives';
import { computed } from '@vielzeug/ripple';
import * as lucideModule from 'lucide';

import { warn } from '../../_dev';
import styles from './icon.css?inline';

export type IconNode = Array<[string, Record<string, string | number | undefined>]>;

const DEFAULT_SIZE = 16;
const DEFAULT_STROKE_WIDTH = 2;
const LUCIDE_VIEWBOX_SIZE = 24;
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Allowlisted SVG shape/structure element names. Only these tags are permitted
 * when building the SVG DOM from an IconNode, preventing arbitrary element
 * injection (e.g. <script>, event-handler-bearing elements).
 */
const ALLOWED_SVG_TAGS = new Set([
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

/**
 * Allowlisted SVG presentation / structural attribute names.
 * Event handler attributes (on*) and "xlink:href" are excluded.
 */
const ATTR_KEY_RE = /^[a-zA-Z][a-zA-Z0-9:_-]*$/;
const BLOCKED_ATTR_RE = /^(on|xlink:|xml:|href$)/i;

// Sync registry seeded from lucide at module load; extend at any time via registerIcons()
const registry = new Map<string, IconNode>(
  Object.entries((lucideModule as unknown as { icons: Record<string, IconNode> }).icons),
);

/**
 * Register additional icons (or override existing ones) by name.
 * Keys may be kebab-case or PascalCase — both are accepted by `ore-icon`.
 */
export function registerIcons(icons: Record<string, IconNode>): void {
  for (const [name, node] of Object.entries(icons)) {
    registry.set(name, node);
  }
}

const toPascalCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');

const parseSize = (value: string | null): number | string => {
  if (value == null || value === '') return DEFAULT_SIZE;

  const n = Number(value);

  return Number.isFinite(n) && n > 0 && /^\d+(\.\d+)?$/.test(value.trim()) ? n : value;
};

const resolveIcon = (name: string): IconNode | undefined => registry.get(name) ?? registry.get(toPascalCase(name));

/**
 * Builds an allowlisted SVG child element via `createElementNS` — real DOM construction, not
 * HTML-string parsing, so this never touches ore's `raw()` directive (and its "unsanitized
 * HTML" dev warning) at all. `iconNode` entries come from the bundled Lucide icon set or
 * `registerIcons()` (a developer/build-time API, never runtime user input), but the tag/attr
 * allowlist stays as defense in depth regardless of where the data originated.
 */
const createSvgChild = (tag: string, attrs: Record<string, string | number | undefined>): SVGElement | null => {
  if (!ALLOWED_SVG_TAGS.has(tag)) return null;

  const el = document.createElementNS(SVG_NS, tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined) continue;

    if (!ATTR_KEY_RE.test(key) || BLOCKED_ATTR_RE.test(key)) continue;

    el.setAttribute(key, String(value));
  }

  return el;
};

/** Icon component properties */
export type OreIconProps = {
  /** Keep stroke width visually consistent when icon size changes */
  absoluteStrokeWidth?: boolean;
  /** Accessible text label. Decorative icons should omit this. */
  label?: string;
  /** Lucide icon name, e.g. `search` or `chevron-right` */
  name?: string;
  /** Icon width/height in px by default. Accepts CSS lengths. */
  size?: number | string;
  /** Render as a filled/solid shape instead of a stroked outline */
  solid?: boolean;
  /** SVG stroke width */
  strokeWidth?: number;
};

/**
 * Icon wrapper for consistent Lucide rendering across Block.
 *
 * @element ore-icon
 *
 * @attr {string} name - Lucide icon name, e.g. `search` or `chevron-right`
 * @attr {number|string} size - Width/height (default: 16)
 * @attr {number} stroke-width - SVG stroke width (default: 2)
 * @attr {boolean} absolute-stroke-width - Keep stroke width visually stable across icon sizes
 * @attr {boolean} solid - Render as filled shape instead of stroked outline
 * @attr {string} label - Accessible label; when omitted the icon is decorative
 *
 * @csspart svg - Internal SVG element
 *
 * @example
 * ```html
 * <ore-icon name="search"></ore-icon>
 * <ore-icon name="chevron-right" size="18"></ore-icon>
 * <ore-icon name="trash-2" label="Delete"></ore-icon>
 * <ore-icon name="star" solid></ore-icon>
 * ```
 */
export const ICON_TAG = 'ore-icon' as const;
define<OreIconProps>(ICON_TAG, {
  props: {
    absoluteStrokeWidth: prop.bool(),
    label: prop.string(),
    name: prop.string(),
    size: { default: DEFAULT_SIZE as number | string, parse: parseSize, reflect: false },
    solid: prop.bool(),
    strokeWidth: prop.number(DEFAULT_STROKE_WIDTH),
  },
  setup(props) {
    bind({
      attr: {
        'aria-hidden': () => ((props.label.value ?? '').trim() ? null : 'true'),
        'aria-label': () => (props.label.value ?? '').trim() || null,
        role: () => ((props.label.value ?? '').trim() ? 'img' : null),
      },
      style: {
        '--_size-px': () => {
          const s = props.size.value;

          return typeof s === 'number' ? `${s}px` : String(s);
        },
      },
    });

    const svgRef = ref<SVGSVGElement>();

    // Memoized so an unknown icon name only warns once per change, not once per reactive read.
    const iconNode = computed(() => {
      const name = (props.name.value ?? '').trim();

      if (!name) return undefined;

      const node = resolveIcon(name);

      if (!node) warn(`ore-icon: icon not found: "${name.slice(0, 64)}"`);

      return node;
    });

    // Real DOM construction (createElementNS), not the raw() directive — see createSvgChild's
    // doc comment. Rebuilds the <svg>'s attributes and children whenever the icon name, size,
    // or presentation props change, or when `svgRef` first attaches (a fresh element mounts
    // every time `when()`'s branch below flips truthy).
    watchEffect(() => {
      const svg = svgRef.value;
      const node = iconNode.value;

      if (!svg || !node) return;

      const size = props.size.value;
      const numericSize = typeof size === 'number' ? size : LUCIDE_VIEWBOX_SIZE;
      const strokeWidth =
        props.absoluteStrokeWidth.value && !props.solid.value
          ? props.strokeWidth.value! * (LUCIDE_VIEWBOX_SIZE / numericSize)
          : props.strokeWidth.value!;

      svg.setAttribute('fill', props.solid.value ? 'currentColor' : 'none');
      svg.setAttribute('stroke', props.solid.value ? 'none' : 'currentColor');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('stroke-width', String(props.solid.value ? 0 : strokeWidth));
      svg.setAttribute('viewBox', '0 0 24 24');

      const children = node.map(([tag, attrs]) => createSvgChild(tag, attrs)).filter((el): el is SVGElement => !!el);

      svg.replaceChildren(...children);
    });

    return html`${when(
      () => !!iconNode.value,
      () => html`<svg ref="${svgRef}" part="svg" style="width:100%;height:100%"></svg>`,
    )}`;
  },
  styles: [styles],
});
