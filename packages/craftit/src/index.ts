/**
 * Craftit
 * Modern, lightweight web components with signals-based reactivity
 */

// ============================================
// Core - Component System & Reactivity
// ============================================

// Component definition
export { define, type SetupFunction, type SetupResult } from './core/define';

// Error boundaries
export {
  createErrorBoundary,
  type ErrorBoundaryOptions,
  type ErrorInfo,
  errorBoundary,
  setGlobalErrorHandler,
} from './core/error-boundary';

// Lazy loading
export { type LazyOptions, lazy } from './core/lazy';

// Lifecycle hooks
export { onMount, onUnmount, onUpdated } from './core/lifecycle';

// Signals & Reactivity
export {
  batch,
  type Cleanup,
  type ComputedSignal,
  computed,
  deepEqual,
  effect,
  readonly,
  type Signal,
  shallowEqual,
  signal,
  untrack,
  watch,
} from './core/signal';

// TypeScript utilities
export {
  isComputedSignal,
  isReactive,
  isSignal,
  type UnwrapReactive,
  type UnwrapSignal,
} from './core/types';

// ============================================
// Template - HTML & JSX
// ============================================

// HTML template
// Note: html object includes helper methods: html.classes(), html.style(), html.when(), html.each(), etc.
export { html, type TemplateResult } from './template/html';
// Security & Sanitization
export {
  escapeHTML,
  isTrustedHTML,
  sanitizeHTML,
  sanitizeURL,
  type TrustedHTML,
  trustHTML,
} from './template/sanitize';

// ============================================
// Composables - Reusable Logic
// ============================================

// Context (Provide/Inject)
export {
  type InjectionKey,
  inject,
  onCleanup,
  provide,
} from './composables/context';
// Props/Attributes
export { type PropOptions, prop } from './composables/props';
// Element refs
export { type Ref, ref } from './composables/ref';
// Slots
export {
  defaultSlot,
  slot,
} from './composables/slots';
// Styling (with CSP support)
export { type CSSResult, createStyleElement, css } from './composables/style';

// ============================================
// Testing
// ============================================

// Complete testing toolkit
export {
  // Types
  type ComponentFixture,
  cleanup,
  // Helpers
  createMockComponent,
  createTestContext,
  // Events
  fireEvent,
  // Mounting
  mount,
  runInContext,
  userEvent,
  // Waiting utilities
  waitFor,
  waitForElement,
  waitForElementToBeRemoved,
  waitForRef,
  waitForSignal,
} from './test/trial';
