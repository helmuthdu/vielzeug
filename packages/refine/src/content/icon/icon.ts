import { bind, define, html, prop, ref, watchEffect, when } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';

import { warn } from '../../_dev';
import { resolveIcon } from '../../icons/registry';
import { createIconChildren } from '../../icons/svg';
import '../../icons/defaults';
import styles from './icon.css?inline';

export type { IconAttributes, IconDefinition, IconElement } from '../../icons';
export { registerIcons } from '../../icons';

const DEFAULT_SIZE = 16;
let instanceId = 0;

const parseSize = (value: string | null): number | string => {
  if (value == null || value === '') return DEFAULT_SIZE;

  const n = Number(value);

  return Number.isFinite(n) && n > 0 && /^\d+(\.\d+)?$/.test(value.trim()) ? n : value;
};

/** Icon component properties */
export type OreIconProps = {
  /** Keep stroke width visually consistent when icon size changes */
  absoluteStrokeWidth?: boolean;
  /** Accessible text label. Decorative icons should omit this. */
  label?: string;
  /** Registered icon name, e.g. `search` or `heroicons:home` */
  name?: string;
  /** Icon width/height in px by default. Accepts CSS lengths. */
  size?: number | string;
  /** Render as a filled/solid shape instead of a stroked outline */
  solid?: boolean;
  /** SVG stroke width */
  strokeWidth?: number;
};

/**
 * Library-neutral SVG icon rendering with explicit local registration.
 *
 * Names resolve from a synchronous registry: refine's own component icons are
 * always registered; apps register their set with `registerIcons()` or import
 * `@vielzeug/refine/icons/lucide/all` for the complete Lucide library.
 *
 * @element ore-icon
 *
 * @attr {string} name - Registered icon name
 * @attr {number|string} size - Width/height (default: 16)
 * @attr {number} stroke-width - Override the icon's stroke width
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
    strokeWidth: prop.number(),
  },
  setup(props) {
    const prefix = `ore-icon-${++instanceId}-`;
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

    // Rebuild from validated data so presentation overrides never leak between icons.
    watchEffect(() => {
      const svg = svgRef.value;
      const node = iconNode.value;

      if (!svg || !node) return;

      for (const attr of [...svg.attributes]) {
        if (attr.name !== 'part' && attr.name !== 'style') svg.removeAttribute(attr.name);
      }
      for (const [key, value] of Object.entries(node.presentation ?? {})) {
        if (value !== undefined)
          svg.setAttribute(key, String(value).replace(/url\(#([\w:.-]+)\)/g, `url(#${prefix}$1)`));
      }
      svg.setAttribute('viewBox', node.viewBox.join(' '));
      const children = createIconChildren(node, prefix);
      if (props.strokeWidth.value !== undefined) {
        svg.setAttribute('stroke-width', String(props.strokeWidth.value));
        for (const child of children) {
          child.removeAttribute('stroke-width');
          for (const nested of child.querySelectorAll('[stroke-width]')) nested.removeAttribute('stroke-width');
        }
      }
      if (props.absoluteStrokeWidth.value) {
        // Non-scaling stroke also handles CSS sizes and non-square viewBoxes.
        for (const child of children) {
          child.setAttribute('vector-effect', 'non-scaling-stroke');
          for (const nested of child.querySelectorAll('*')) nested.setAttribute('vector-effect', 'non-scaling-stroke');
        }
      }
      if (props.solid.value) {
        for (const element of [svg, ...children.flatMap((child) => [child, ...child.querySelectorAll('*')])]) {
          element.setAttribute('fill', 'currentColor');
          element.setAttribute('stroke', 'none');
        }
      }
      svg.replaceChildren(...children);
    });

    return html`
      ${when(
        () => !!iconNode.value,
        () => html`
          <svg ref="${svgRef}" part="svg" style="width:100%;height:100%"></svg>
        `,
      )}
    `;
  },
  styles: [styles],
});
