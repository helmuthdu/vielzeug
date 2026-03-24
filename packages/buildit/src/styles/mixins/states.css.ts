import { css } from '@vielzeug/craftit';

/**
 * Disabled State Mixin
 *
 * Provides consistent disabled styling across interactive components.
 * Reduces opacity, changes cursor, and prevents pointer events.
 *
 * @param selector - Optional CSS selector to apply styles to (default: component root)
 * @returns CSSResult with disabled state styles
 *
 * @example
 * ```ts
 * import { disabledStateMixin } from '../../styles';
 *
 * return {
 *   styles: [disabledStateMixin(), componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const disabledStateMixin = (selector = '') => {
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
 * @returns CSSResult with loading state styles
 *
 * @example
 * ```ts
 * import { loadingStateMixin } from '../../styles';
 *
 * return {
 *   styles: [loadingStateMixin(), componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const loadingStateMixin = (selector = '') => {
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
 * @returns CSSResult with both disabled and loading state styles
 *
 * @example
 * ```ts
 * import { disabledLoadingMixin } from '../../styles';
 *
 * return {
 *   styles: [disabledLoadingMixin('button'), componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const disabledLoadingMixin = (selector = '') => {
  const sel = selector ? ` ${selector}` : '';

  return css`
    :host([disabled])${sel}, :host([loading])${sel} {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    :host([loading])${sel} {
      cursor: wait;
    }
  `;
};
