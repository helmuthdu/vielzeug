import { css } from '@vielzeug/craft';

// ── Padding ───────────────────────────────────────────────────────────────────

/**
 * Padding Variant Mixin
 *
 * Provides padding size variants (none, sm, md, lg, xl) via CSS custom properties.
 * Sets the --_padding variable based on padding attribute.
 *
 * @example
 * ```ts
 * import { paddingMixin } from '../../styles';
 *
 * return {
 *   styles: [paddingMixin, componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const paddingMixin = css`
  /* ========================================
     Padding Variants
     ======================================== */

  :host([padding='none']) {
    --_padding: var(--size-0);
  }

  :host([padding='sm']) {
    --_padding: var(--size-3);
  }

  :host([padding='md']) {
    --_padding: var(--size-4);
  }

  :host([padding='lg']) {
    --_padding: var(--size-6);
  }

  :host([padding='xl']) {
    --_padding: var(--size-8);
  }
`;

// ── Rounded ───────────────────────────────────────────────────────────────────

/**
 * Rounded Variant Mixin
 *
 * Shared border-radius variant styles for components.
 * Maps rounded attribute values to theme border radius tokens.
 *
 * @example
 * ```ts
 * import { roundedVariantMixin } from '../../styles';
 *
 * return {
 *   styles: [roundedVariantMixin, componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const roundedVariantMixin = css`
  :host([rounded='none']) {
    --_radius: var(--rounded-none);
  }
  :host([rounded='sm']) {
    --_radius: var(--rounded-sm);
  }
  :host([rounded='md']) {
    --_radius: var(--rounded-md);
  }
  :host([rounded='lg']) {
    --_radius: var(--rounded-lg);
  }
  :host([rounded='xl']) {
    --_radius: var(--rounded-xl);
  }
  :host([rounded='2xl']) {
    --_radius: var(--rounded-2xl);
  }
  :host([rounded='3xl']) {
    --_radius: var(--rounded-3xl);
  }
  :host([rounded='full']),
  :host([rounded='']) {
    --_radius: var(--rounded-full);
  }
`;

// ── Size Variants ─────────────────────────────────────────────────────────────

/**
 * Size Variant Mixin
 *
 * Injects the three standard size tiers (sm / md / lg) as CSS custom property
 * blocks on `:host([size="…"])`. Per-component overrides are supplied as a raw
 * CSS string for each tier and are appended after the shared defaults.
 *
 * All property names use the `--_` internal convention already established by
 * other mixins. The mapping is:
 *
 * | Config key   | CSS custom property  |
 * |------------- |----------------------|
 * | fontSize     | --_font-size         |
 * | gap          | --_gap               |
 * | height       | --_height            |
 * | iconSize     | --_icon-size         |
 * | lineHeight   | --_line-height       |
 * | padding      | --_padding           |
 * | size         | --_size              |
 * | thumbSize    | --_thumb-size        |
 * | width        | --_width             |
 * | --foo        | --foo (pass-through) |
 *
 * @example
 * ```ts
 * styles: [
 *   sizeVariantMixin({
 *     sm: { height: 'var(--size-8)', padding: 'var(--size-1-5) var(--size-3)' },
 *     lg: { height: 'var(--size-12)', padding: 'var(--size-2-5) var(--size-5)' },
 *   }),
 *   componentStyles,
 * ]
 * ```
 */
export type SizeConfig = {
  /** Arbitrary CSS custom properties (must start with --) */
  [key: `--${string}`]: string | undefined;
  /** Font size — maps to --_font-size */
  fontSize?: string;
  /** Gap between elements — maps to --_gap */
  gap?: string;
  /** Element height — maps to --_height */
  height?: string;
  /** Icon size — maps to --_icon-size */
  iconSize?: string;
  /** Line height — maps to --_line-height */
  lineHeight?: string;
  /** Internal padding — maps to --_padding */
  padding?: string;
  /** Element size (width/height) — maps to --_size */
  size?: string;
  /** Thumb size (e.g. toggle/switch thumb) — maps to --_thumb-size */
  thumbSize?: string;
  /** Element width — maps to --_width */
  width?: string;
};

const PROP_MAP: Record<string, string> = {
  fontSize: '--_font-size',
  gap: '--_gap',
  height: '--_height',
  iconSize: '--_icon-size',
  lineHeight: '--_line-height',
  padding: '--_padding',
  size: '--_size',
  thumbSize: '--_thumb-size',
  width: '--_width',
};

const configToBlock = (config: SizeConfig): string =>
  Object.entries(config)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k.startsWith('--') ? k : (PROP_MAP[k] ?? `--_${k}`)}: ${v};`)
    .join('\n        ');

export const sizeVariantMixin = (config?: { lg?: SizeConfig; md?: SizeConfig; sm?: SizeConfig }) => {
  const sm = configToBlock({
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-1-5)',
    size: 'var(--size-4)',
    ...config?.sm,
  });
  const md = configToBlock({
    fontSize: 'var(--text-sm)',
    gap: 'var(--size-2)',
    size: 'var(--size-5)',
    ...config?.md,
  });
  const lg = configToBlock({
    fontSize: 'var(--text-base)',
    gap: 'var(--size-2-5)',
    size: 'var(--size-6)',
    ...config?.lg,
  });

  return css`
    :host {
      ${md}
    }
    :host([size='sm']) {
      ${sm}
    }
    :host([size='md']) {
      ${md}
    }
    :host([size='lg']) {
      ${lg}
    }
  `;
};
