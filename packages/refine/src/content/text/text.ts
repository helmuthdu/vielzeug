import { bind, define, html, prop } from '@vielzeug/ore';

import styles from './text.css?inline';

const TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;
const TEXT_ELEMENTS = ['span', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'code'] as const;
const TEXT_COLORS = [
  'primary',
  'secondary',
  'info',
  'success',
  'warning',
  'error',
  'heading',
  'body',
  'muted',
  'tertiary',
  'disabled',
  'contrast',
] as const;
const TEXT_SIZES = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
const TEXT_VARIANTS = ['body', 'heading', 'label', 'caption', 'overline', 'code'] as const;
const TEXT_WEIGHTS = ['normal', 'medium', 'semibold', 'bold'] as const;

/** Text component properties */
export type OreTextProps = {
  /** Text alignment */
  align?: (typeof TEXT_ALIGNMENTS)[number];
  /** Semantic HTML element to render as: sets the correct ARIA role/level on the host */
  as?: (typeof TEXT_ELEMENTS)[number];
  /** Text color (semantic + theme colors) */
  color?: (typeof TEXT_COLORS)[number];
  /** Italic text style */
  italic?: boolean;
  /** Clamp text to N lines with an ellipsis (multi-line truncation) */
  lines?: number;
  /** Text size: maps to --text-* tokens for body variants and --heading-* tokens for the heading variant */
  size?: (typeof TEXT_SIZES)[number];
  /** Enable single-line text truncation with ellipsis */
  truncate?: boolean;
  /** Text semantic variant */
  variant?: (typeof TEXT_VARIANTS)[number];
  /** Font weight */
  weight?: (typeof TEXT_WEIGHTS)[number];
};

/**
 * A typography component with semantic variants and responsive sizing.
 *
 * @element ore-text
 *
 * @attr {string} variant - Text variant: 'body' | 'heading' | 'label' | 'caption' | 'overline' | 'code'
 * @attr {string} size - Font size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'. Maps to --text-* tokens for body variants and --heading-* tokens for the heading variant.
 * @attr {string} weight - Font weight: 'normal' | 'medium' | 'semibold' | 'bold'
 * @attr {string} color - Text color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'heading' | 'body' | 'muted' | 'tertiary' | 'disabled' | 'contrast'
 * @attr {string} align - Text alignment: 'left' | 'center' | 'right' | 'justify'
 * @attr {boolean} truncate - Truncate text with ellipsis when it overflows (single-line)
 * @attr {number} lines - Clamp to N lines with ellipsis (multi-line truncation)
 * @attr {boolean} italic - Italic text style
 * @attr {string} as - Semantic HTML element: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'code'
 *
 * @slot - Text content
 *
 * @cssprop --text-size - Font size
 * @cssprop --text-weight - Font weight
 * @cssprop --text-color - Text color
 * @cssprop --text-line-height - Line height
 * @cssprop --text-letter-spacing - Letter spacing
 *
 * @example
 * ```html
 * <ore-text variant="heading" size="2xl" weight="bold">Welcome</ore-text>
 * <ore-text as="h2" variant="heading" size="xl">Section title</ore-text>
 * <ore-text color="primary" weight="semibold">Important notice</ore-text>
 * <ore-text variant="code">npm install</ore-text>
 * <ore-text lines="2">Long paragraph that clamps at two lines…</ore-text>
 * ```
 */

export const TEXT_TAG = 'ore-text' as const;
define<OreTextProps>(TEXT_TAG, {
  props: {
    align: prop.oneOf(TEXT_ALIGNMENTS),
    as: prop.oneOf(TEXT_ELEMENTS),
    color: prop.oneOf(TEXT_COLORS),
    italic: prop.bool(),
    lines: prop.number(),
    size: prop.oneOf(TEXT_SIZES),
    truncate: prop.bool(),
    variant: prop.oneOf(TEXT_VARIANTS),
    weight: prop.oneOf(TEXT_WEIGHTS),
  },
  setup(props) {
    bind({
      attr: {
        'aria-level': () => {
          const match = /^h([1-6])$/.exec((props.as.value as string) ?? '');

          return match ? match[1] : null;
        },
        role: () => (/^h([1-6])$/.test((props.as.value as string) ?? '') ? 'heading' : null),
      },
      style: {
        '--_lines': () => (props.lines.value != null ? String(props.lines.value) : null),
      },
    });

    return html`
      <slot></slot>
    `;
  },
  styles: [styles],
});
