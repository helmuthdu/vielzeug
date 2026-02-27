import { css } from '@vielzeug/craftit';

/**
 * Padding Variant Mixin
 *
 * Provides padding size variants (none, sm, md, lg, xl) via CSS custom properties.
 * Sets the --_padding variable based on padding attribute.
 *
 * @returns CSS string with padding variant definitions
 *
 * @example
 * ```typescript
 * import { paddingMixin } from '../../styles';
 *
 * const styles = css`
 *   ${paddingMixin()}
 *
 *   .my-element {
 *     padding: var(--_padding);
 *   }
 * `;
 * ```
 */
export const paddingMixin = () => css`
  @layer buildit.utilities {
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
  }
`;
