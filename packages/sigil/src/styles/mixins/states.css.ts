import { css } from '@vielzeug/craft';

/**
 * Disabled State Mixin
 *
 * Reduces opacity and shows `not-allowed` cursor on the host.
 * `pointer-events: none` is placed on the inner slot so the host stays
 * hoverable (e.g. for tooltips that explain why the control is disabled).
 */
export const disabledStateMixin = css`
  :host([disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :host([disabled]) ::slotted(*),
  :host([disabled]) > :not(slot) {
    pointer-events: none;
  }
`;

/**
 * Loading State Mixin
 *
 * Shows `wait` cursor on the host; blocks pointer events on inner content.
 */
export const loadingStateMixin = css`
  :host([loading]) {
    opacity: 0.5;
    cursor: wait;
  }

  :host([loading]) ::slotted(*),
  :host([loading]) > :not(slot) {
    pointer-events: none;
  }
`;

/**
 * Combined Disabled & Loading State Mixin
 *
 * Convenience mixin combining both disabled and loading host states.
 * Use for most interactive components that support both attributes.
 *
 * - Host receives the correct cursor (not-allowed / wait) and remains
 *   hoverable so external tooltip wrappers can still fire pointer events.
 * - Inner shadow-DOM children have pointer-events disabled so they refuse
 *   clicks while the host cursor signal is still visible.
 */
export const disabledLoadingMixin = css`
  :host([disabled]),
  :host([loading]) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :host([loading]) {
    cursor: wait;
  }

  :host([disabled]) > :not(slot),
  :host([loading]) > :not(slot) {
    pointer-events: none;
  }
`;
