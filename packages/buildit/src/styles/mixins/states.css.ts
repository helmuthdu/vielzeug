import { css } from '@vielzeug/craftit';

/**
 * Disabled State Mixin
 *
 * Provides consistent disabled styling across interactive components.
 * Reduces opacity, changes cursor, and prevents pointer events.
 *
 * @param selector - Optional CSS selector to apply styles to (default: component root)
 * @returns CSS string with disabled state styles
 *
 * @example
 * ```typescript
 * import { disabledStateMixin } from '../../styles';
 *
 * const styles = css`
 *   ${disabledStateMixin()}  // Applies to :host
 *
 *   // Or for specific element:
 *   ${disabledStateMixin('button')}
 * `;
 * ```
 */
export const disabledStateMixin = (selector: string = '') => {
  const sel = selector ? ` ${selector}` : '';

  return css`
    :host([disabled])${sel} {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
  `;
};

/**
 * Loading State Mixin
 *
 * Provides consistent loading styling across interactive components.
 * Similar to disabled but for loading states.
 *
 * @param selector - Optional CSS selector to apply styles to (default: component root)
 * @returns CSS string with loading state styles
 *
 * @example
 * ```typescript
 * import { loadingStateMixin } from '../../styles';
 *
 * const styles = css`
 *   ${loadingStateMixin()}  // Applies to :host
 *
 *   // Or for specific element:
 *   ${loadingStateMixin('button')}
 * `;
 * ```
 */
export const loadingStateMixin = (selector: string = '') => {
  const sel = selector ? ` ${selector}` : '';

  return css`
    :host([loading])${sel} {
      opacity: 0.5;
      cursor: wait;
      pointer-events: none;
    }
  `;
};

/**
 * Combined Disabled & Loading State Mixin
 *
 * Convenience mixin that combines both disabled and loading states.
 * Most interactive components need both.
 *
 * @param selector - Optional CSS selector to apply styles to
 * @returns CSS string with both disabled and loading state styles
 *
 * @example
 * ```typescript
 * import { disabledLoadingMixin } from '../../styles';
 *
 * const styles = css`
 *   ${disabledLoadingMixin('button')}
 * `;
 * ```
 */
export const disabledLoadingMixin = (selector: string = '') => {
  const sel = selector ? ` ${selector}` : '';

  return css`
    :host([disabled])${sel},
    :host([loading])${sel} {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    :host([loading])${sel} {
      cursor: wait;
    }
  `;
};

