import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * # bit-text
 *
 * A typography component with semantic variants and responsive sizing.
 *
 * @element bit-text
 */

const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    /* Internal variables with CSS custom property fallbacks */
    --_size: var(--text-size, var(--text-base));
    --_weight: var(--text-weight, var(--font-normal));
    --_color: var(--text-color, inherit);
    --_line-height: var(--text-line-height, var(--leading-normal));
    --_letter-spacing: var(--text-letter-spacing, normal);
    
    display: block;
    font-size: var(--_size);
    font-weight: var(--_weight);
    color: var(--_color);
    line-height: var(--_line-height);
    letter-spacing: var(--_letter-spacing);
  }

  :host([hidden]) {
    display: none;
  }

  /* ========================================
     Variant Styles
     ======================================== */

  /* Body (default) - uses base defaults */

  /* Heading */
  :host([variant='heading']) {
    --_weight: var(--text-weight, var(--font-semibold));
    --_color: var(--text-color, var(--text-color-heading));
    --_line-height: var(--text-line-height, var(--leading-tight));
  }

  /* Label */
  :host([variant='label']) {
    --_weight: var(--text-weight, var(--font-medium));
    --_color: var(--text-color, var(--text-color-heading));
  }

  /* Caption */
  :host([variant='caption']) {
    --_size: var(--text-size, var(--text-sm));
    --_color: var(--text-color, var(--text-color-secondary));
  }

  /* Overline */
  :host([variant='overline']) {
    --_size: var(--text-size, var(--text-xs));
    --_weight: var(--text-weight, var(--font-semibold));
    --_letter-spacing: var(--text-letter-spacing, 0.05em);
    text-transform: uppercase;
  }

  /* Code */
  :host([variant='code']) {
    --_size: var(--text-size, var(--text-sm));
    font-family: var(--font-mono, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='xs']) { --_size: var(--text-xs); }
  :host([size='sm']) { --_size: var(--text-sm); }
  :host([size='md']) { --_size: var(--text-base); }
  :host([size='lg']) { --_size: var(--text-lg); }
  :host([size='xl']) { --_size: var(--text-xl); }
  :host([size='2xl']) { --_size: var(--text-2xl); }
  :host([size='3xl']) { --_size: var(--text-3xl); }
  :host([size='4xl']) { --_size: var(--text-4xl); }
  :host([size='5xl']) { --_size: var(--text-5xl); }
  :host([size='6xl']) { --_size: var(--text-6xl); }
  :host([size='7xl']) { --_size: var(--text-7xl); }
  :host([size='8xl']) { --_size: var(--text-8xl); }
  :host([size='9xl']) { --_size: var(--text-9xl); }

  /* ========================================
     Weight Variants
     ======================================== */

  :host([weight='normal']) { --_weight: var(--font-normal); }
  :host([weight='medium']) { --_weight: var(--font-medium); }
  :host([weight='semibold']) { --_weight: var(--font-semibold); }
  :host([weight='bold']) { --_weight: var(--font-bold); }

    /* ========================================
       Color Variants
       ======================================== */

    :host([color='primary']) { --_color: var(--color-primary); }
    :host([color='secondary']) { --_color: var(--color-secondary); }
    :host([color='info']) { --_color: var(--color-info); }
    :host([color='success']) { --_color: var(--color-success); }
    :host([color='warning']) { --_color: var(--color-warning); }
    :host([color='error']) { --_color: var(--color-error); }
    :host([color='heading']) { --_color: var(--text-color-heading); }
    :host([color='body']) { --_color: var(--text-color-body); }
    :host([color='muted']) { --_color: var(--text-color-secondary); }
    :host([color='disabled']) { --_color: var(--text-color-disabled); }
    :host([color='contrast']) { --_color: var(--text-color-contrast); }
  }

  @layer buildit.utilities {
    /* ========================================
       Alignment
       ======================================== */

    :host([align]) { display: block; }
    :host([align='left']) { text-align: left; }
    :host([align='center']) { text-align: center; }
    :host([align='right']) { text-align: right; }
    :host([align='justify']) { text-align: justify; }

    /* ========================================
       Truncate
       ======================================== */

    :host([truncate]) {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ========================================
       Italic
       ======================================== */

    :host([italic]) {
      font-style: italic;
    }

    /* ========================================
       Block Display for Certain Tags
       ======================================== */

    :host([as='p']),
    :host([as='div']),
    :host(:is([as='h1'], [as='h2'], [as='h3'], [as='h4'], [as='h5'], [as='h6'])) {
      display: block;
    }
  }
`;

/**
 * Text Component Properties
 *
 * A flexible typography component with semantic variants, responsive sizing, and theme color support.
 *
 * ## Slots
 * - **default**: Text content
 *
 * ## CSS Custom Properties
 * - `--text-size`: Font size
 * - `--text-weight`: Font weight
 * - `--text-color`: Text color
 * - `--text-line-height`: Line height
 * - `--text-letter-spacing`: Letter spacing
 *
 * @example
 * ```html
 * <!-- Heading -->
 * <bit-text variant="heading" size="3xl" weight="bold">
 *   Welcome to Our Site
 * </bit-text>
 *
 * <!-- Body text -->
 * <bit-text variant="body" size="base">
 *   This is regular body text with default styling.
 * </bit-text>
 *
 * <!-- Colored text -->
 * <bit-text color="primary" weight="semibold">
 *   Important notice
 * </bit-text>
 *
 * <!-- Caption/muted -->
 * <bit-text variant="caption" color="muted">
 *   Posted 2 hours ago
 * </bit-text>
 *
 * <!-- Overline -->
 * <bit-text variant="overline" size="xs">
 *   Featured Article
 * </bit-text>
 *
 * <!-- Code -->
 * <bit-text variant="code">
 *   npm install @vielzeug/buildit
 * </bit-text>
 *
 * <!-- Truncated text -->
 * <bit-text truncate>
 *   This is a very long text that will be truncated with ellipsis...
 * </bit-text>
 *
 * <!-- Custom element -->
 * <bit-text as="h1" size="4xl" weight="bold">
 *   Page Heading
 * </bit-text>
 * ```
 */
export interface TextProps {
  /** Text semantic variant */
  variant?: 'body' | 'heading' | 'label' | 'caption' | 'overline' | 'code';
  /** Text size (responsive scale) */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl';
  /** Font weight */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
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
    | 'disabled'
    | 'contrast';
  /** Text alignment */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** Truncate text with ellipsis */
  truncate?: boolean;
  /** Italic text style */
  italic?: boolean;
  /** Semantic HTML element to render as */
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'code';
}

defineElement<HTMLElement, TextProps>('bit-text', {
  observedAttributes: ['variant', 'size', 'weight', 'color', 'align', 'truncate', 'italic', 'as'] as const,

  styles: [styles],

  template: () => html`<slot></slot>`,
});

export default {};
