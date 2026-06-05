import { css } from '@vielzeug/craft';

/**
 * Disabled State Mixin
 *
 * Provides consistent disabled styling on the host element.
 * Reduces opacity, changes cursor to `not-allowed`, and disables pointer events.
 */
export const disabledStateMixin = css`
  :host([disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

/**
 * Loading State Mixin
 *
 * Provides consistent loading styling on the host element.
 * Similar to `disabledStateMixin` but uses `cursor: wait`.
 */
export const loadingStateMixin = css`
  :host([loading]) {
    opacity: 0.5;
    cursor: wait;
    pointer-events: none;
  }
`;

/**
 * Combined Disabled & Loading State Mixin
 *
 * Convenience mixin combining both disabled and loading host states.
 * Use for most interactive components that support both attributes.
 */
export const disabledLoadingMixin = css`
  :host([disabled]),
  :host([loading]) {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  :host([loading]) {
    cursor: wait;
  }
`;
