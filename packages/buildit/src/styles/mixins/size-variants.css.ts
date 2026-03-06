import { css } from '@vielzeug/craftit';

/**
 * Size Variant Mixin
 *
 * Provides consistent size variants (sm, md, lg) across components.
 * Reduces code duplication for size-based styling.
 *
 * @param config - Optional configuration for size-specific values
 * @returns CSSResult with size variant styles
 *
 * @example
 * ```ts
 * import { sizeVariantMixin } from '../../styles';
 *
 * return {
 *   styles: [sizeVariantMixin(), componentStyles],
 *   template: html`...`
 * };
 * ```
 *
 * @example
 * ```ts
 * // Custom size configuration
 * return {
 *   styles: [sizeVariantMixin({
 *     sm: { size: 'var(--size-3)', fontSize: 'var(--text-2xs)' },
 *     lg: { size: 'var(--size-8)', fontSize: 'var(--text-lg)' },
 *   }), componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const sizeVariantMixin = (config?: {
  /** Small size configuration */
  sm?: {
    /** Element size (width/height) - maps to --_size */
    size?: string;
    /** Font size - maps to --_font-size */
    fontSize?: string;
    /** Gap between elements - maps to gap property */
    gap?: string;
    /** Custom properties (must start with --) */
    [key: string]: string | undefined;
  };
  /** Medium size configuration (default) */
  md?: {
    size?: string;
    fontSize?: string;
    gap?: string;
    [key: string]: string | undefined;
  };
  /** Large size configuration */
  lg?: {
    size?: string;
    fontSize?: string;
    gap?: string;
    [key: string]: string | undefined;
  };
}) => {
  const defaults = {
    lg: {
      fontSize: 'var(--text-base)',
      gap: 'var(--size-2-5)',
      size: 'var(--size-6)',
    },
    md: {
      fontSize: 'var(--text-sm)',
      gap: 'var(--size-2)',
      size: 'var(--size-5)',
    },
    sm: {
      fontSize: 'var(--text-xs)',
      gap: 'var(--size-1-5)',
      size: 'var(--size-4)',
    },
  };

  const sm = { ...defaults.sm, ...config?.sm };
  const md = { ...defaults.md, ...config?.md };
  const lg = { ...defaults.lg, ...config?.lg };

  // Helper to convert camelCase to kebab-case
  const camelToKebab = (str: string): string => {
    return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  };

  // Helper to generate CSS for a size
  const generateSizeCSS = (sizeConfig: typeof sm) => {
    return Object.entries(sizeConfig)
      .map(([key, value]) => {
        if (value === undefined) return '';

        // If it already starts with --, pass it through as-is (custom property)
        if (key.startsWith('--')) {
          return `${key}: ${value};`;
        }

        // Convert camelCase to --_kebab-case custom property
        // Examples: gap → --_gap, fontSize → --_font-size, lineHeight → --_line-height
        const customProperty = `--_${camelToKebab(key)}`;
        return `${customProperty}: ${value};`;
      })
      .filter(Boolean)
      .join('\n        ');
  };

  return css`
    /* ========================================
       Size Variants (Shared Mixin)
       ======================================== */

    /* Small */
    :host([size='sm']) {
      ${generateSizeCSS(sm)}
    }

    /* Medium (default, can be used for explicit md attribute) */
    :host([size='md']) {
      ${generateSizeCSS(md)}
    }

    /* Large */
    :host([size='lg']) {
      ${generateSizeCSS(lg)}
    }
  `;
};
