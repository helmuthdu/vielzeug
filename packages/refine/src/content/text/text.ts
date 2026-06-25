import { define, html, prop } from '@vielzeug/ore';

import styles from './text.css?inline';

/** Text component properties */
export type OreTextProps = {
  /** Text alignment */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** Semantic HTML element to render as — sets the correct ARIA role/level on the host */
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'code';
  /** Text color (semantic + theme colors) */
  color?:
    | 'primary'
    | 'secondary'
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
    | 'heading'
    | 'body'
    | 'muted'
    | 'tertiary'
    | 'disabled'
    | 'contrast';
  /** Italic text style */
  italic?: boolean;
  /** Clamp text to N lines with an ellipsis (multi-line truncation) */
  lines?: number;
  /** Text size — maps to --text-* tokens for body variants and --heading-* tokens for the heading variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Enable single-line text truncation with ellipsis */
  truncate?: boolean;
  /** Text semantic variant */
  variant?: 'body' | 'heading' | 'label' | 'caption' | 'overline' | 'code';
  /** Font weight */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
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
    align: prop.string<'left' | 'center' | 'right' | 'justify'>(),
    as: prop.string<'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'code'>(),
    color: prop.string<
      | 'primary'
      | 'secondary'
      | 'info'
      | 'success'
      | 'warning'
      | 'error'
      | 'heading'
      | 'body'
      | 'muted'
      | 'tertiary'
      | 'disabled'
      | 'contrast'
    >(),
    italic: prop.bool(),
    lines: prop.number(),
    size: prop.string<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>(),
    truncate: prop.bool(),
    variant: prop.string<'body' | 'heading' | 'label' | 'caption' | 'overline' | 'code'>(),
    weight: prop.string<'normal' | 'medium' | 'semibold' | 'bold'>(),
  },
  setup(props, { bind, el: _el }) {
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

    return html`<slot></slot>`;
  },
  styles: [styles],
});
