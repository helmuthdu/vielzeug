import { define, computed, html, watch } from '@vielzeug/craftit';
import { raw } from '@vielzeug/craftit/directives';
import * as lucideModule from 'lucide';

import styles from './icon.css?inline';

export type IconNode = Array<[string, Record<string, string | number | undefined>]>;

const DEFAULT_SIZE = 16;
const DEFAULT_STROKE_WIDTH = 2;
const LUCIDE_VIEWBOX_SIZE = 24;

// Sync registry seeded from lucide at module load; extend at any time via registerIcons()
const registry = new Map<string, IconNode>(
  Object.entries((lucideModule as unknown as { icons: Record<string, IconNode> }).icons),
);

/**
 * Register additional icons (or override existing ones) by name.
 * Keys may be kebab-case or PascalCase — both are accepted by `bit-icon`.
 */
export function registerIcons(icons: Record<string, IconNode>): void {
  for (const [name, node] of Object.entries(icons)) {
    registry.set(name, node);
  }
}

const toAttrString = (attrs: Record<string, string | number>): string =>
  Object.entries(attrs)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');

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

/** Icon component properties */
export type BitIconProps = {
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
 * Icon wrapper for consistent Lucide rendering across Buildit.
 *
 * @element bit-icon
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
 * <bit-icon name="search"></bit-icon>
 * <bit-icon name="chevron-right" size="18"></bit-icon>
 * <bit-icon name="trash-2" label="Delete"></bit-icon>
 * <bit-icon name="star" solid></bit-icon>
 * ```
 */
export const ICON_TAG = define<BitIconProps>('bit-icon', {
  props: {
    absoluteStrokeWidth: false,
    label: undefined,
    name: undefined,
    size: { default: DEFAULT_SIZE as number | string, parse: parseSize },
    solid: false,
    strokeWidth: { default: DEFAULT_STROKE_WIDTH, type: Number },
  },
  setup({ host, props }) {
    watch(
      props.label,
      (label) => {
        const text = (label ?? '').trim();

        if (text) {
          host.el.setAttribute('aria-label', text);
          host.el.setAttribute('role', 'img');
          host.el.removeAttribute('aria-hidden');
        } else {
          host.el.setAttribute('aria-hidden', 'true');
          host.el.removeAttribute('aria-label');
          host.el.removeAttribute('role');
        }
      },
      { immediate: true },
    );

    const markup = computed(() => {
      const name = (props.name.value ?? '').trim();

      if (!name) return '';

      const iconNode = registry.get(name) ?? registry.get(toPascalCase(name));

      if (!iconNode) {
        console.warn(`[bit-icon] Icon not found: "${name}"`);

        return '';
      }

      const size = props.size.value ?? DEFAULT_SIZE;
      const cssSize = typeof size === 'number' ? `${size}px` : String(size);
      const numericSize = typeof size === 'number' ? size : LUCIDE_VIEWBOX_SIZE;

      const strokeWidth =
        props.absoluteStrokeWidth.value && !props.solid.value
          ? (props.strokeWidth.value ?? DEFAULT_STROKE_WIDTH) * (LUCIDE_VIEWBOX_SIZE / numericSize)
          : (props.strokeWidth.value ?? DEFAULT_STROKE_WIDTH);

      const nodes = iconNode
        .map(([tag, tagAttrs]) => {
          const attrs: Record<string, string | number> = {};

          for (const [k, v] of Object.entries(tagAttrs)) {
            if (v !== undefined) attrs[k] = v;
          }

          return `<${tag} ${toAttrString(attrs)} />`;
        })
        .join('');

      const svgAttrs = toAttrString({
        fill: props.solid.value ? 'currentColor' : 'none',
        part: 'svg',
        stroke: props.solid.value ? 'none' : 'currentColor',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': props.solid.value ? 0 : strokeWidth,
        style: `height:${cssSize};width:${cssSize}`,
        viewBox: '0 0 24 24',
        xmlns: 'http://www.w3.org/2000/svg',
      });

      return `<svg ${svgAttrs}>${nodes}</svg>`;
    });

    return html`${() => raw(markup.value)}`;
  },
  styles: [styles],
});
