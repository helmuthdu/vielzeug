/** @vielzeug/craftit — Functional, signals-based web component library.
 * Signal primitives (Signal, signal, effect, computed, batch, watch, derived,
 * writable, onCleanup, etc.) are provided by @vielzeug/stateit and
 * re-exported here for convenience.
 */

// ─── Signal primitives (re-exported from @vielzeug/stateit) ──────────────────
// Some names (watch, effect, onCleanup) are overridden below with
// component-context-aware wrappers from ./runtime.
export * from '@vielzeug/stateit';

// ─── Component runtime (overrides stateit exports where named) ────────────────
export { effect, handle, onCleanup, onError, onMount, aria, watch } from './runtime';

// ─── Utilities ────────────────────────────────────────────────────────────────
export { createFormIds, createId, escapeHtml, guard, toKebab } from './utils';

// ─── Template engine ──────────────────────────────────────────────────────────
export { html } from './template';

// ─── CSS helper ───────────────────────────────────────────────────────────────
export { css, type CSSResult } from './css';

// ─── Internal types & directive building blocks ─────────────────────────────
export {
  computedOrStatic,
  EACH_SIGNAL,
  extractResult,
  htmlResult,
  MARKER_PATTERN,
  ref,
  refs,
  type Binding,
  type DirectiveDescriptor,
  type EachResult,
  type HTMLResult,
  type Ref,
  type Refs,
  type RefCallback,
} from './internal';

// ─── Context (useProvide/useInject) ─────────────────────────────────────────────────
export { createContext, syncContextProps, useInject, useProvide, type InjectionKey } from './context';

// ─── Props ────────────────────────────────────────────────────────────────────
export { defineProps, prop, typed, type InferPropsSignals, type PropDef, type PropOptions } from './props';

// ─── Emitters ─────────────────────────────────────────────────────────────────
export { defineEmits, type EmitFn } from './emitter';

// ─── Slots ────────────────────────────────────────────────────────────────────
export { defineSlots, onSlotChange, type Slots } from './slots';

// ─── Form-associated elements ─────────────────────────────────────────────────
export { defineField, type FormFieldCallbacks, type FormFieldHandle, type FormFieldOptions } from './form';

// ─── Platform observers ───────────────────────────────────────────────────────
export { observeIntersection, observeMedia, observeResize } from './observers';

// ─── Component definition ─────────────────────────────────────────────────────
export { define, type DefineOptions, type SetupContext, type SetupResult } from './element';
export { fire } from './runtime';

import { _resetMarkerIndex } from './template';
// ─── Test helpers ─────────────────────────────────────────────────────────────
import { _resetIdCounter } from './utils';

/**
 * Resets the global ID and marker counters to 0.
 * @internal — For use in test environments only. Ensures deterministic IDs across test runs.
 */
export const __resetCounters = (): void => {
  _resetIdCounter();
  _resetMarkerIndex();
};
