import { css } from '@vielzeug/craftit';

/**
 * Elevation Mixin
 *
 * Provides elevation shadow levels (0-5) via CSS custom properties.
 * Sets the --_shadow variable based on elevation attribute.
 *
 * @returns CSS string with elevation level definitions
 *
 * @example
 * ```typescript
 * import { elevationMixin } from '../../styles';
 *
 * const styles = css`
 *   ${elevationMixin()}
 *
 *   .my-element {
 *     box-shadow: var(--_shadow);
 *   }
 * `;
 * ```
 */
export const elevationMixin = () => css`
  @layer buildit.utilities {
    /* ========================================
       Elevation Levels (0-5)
       ======================================== */

    :host([elevation='0']) {
      --_shadow: none;
    }

    :host([elevation='1']) {
      --_shadow: var(--shadow-sm);
    }

    :host([elevation='2']) {
      --_shadow: var(--shadow-md);
    }

    :host([elevation='3']) {
      --_shadow: var(--shadow-lg);
    }

    :host([elevation='4']) {
      --_shadow: var(--shadow-xl);
    }

    :host([elevation='5']) {
      --_shadow: var(--shadow-2xl);
    }
  }
`;
