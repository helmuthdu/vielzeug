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
  errorBoundary,
  setGlobalErrorHandler,
  type ErrorBoundaryOptions,
  type ErrorInfo,
} from './core/error-boundary';

// Lazy loading
export { lazy, type LazyOptions } from './core/lazy';

// Lifecycle hooks
export { onMount, onUnmount, onUpdated } from './core/lifecycle';

// Signals & Reactivity
export {
  batch,
  computed,
  deepEqual,
  effect,
  readonly,
  shallowEqual,
  signal,
  untrack,
  watch,
  type Cleanup,
  type ComputedSignal,
  type Signal,
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
  trustHTML,
  type TrustedHTML,
} from './template/sanitize';

// ============================================
// Composables - Reusable Logic
// ============================================

// Context (Provide/Inject)
export {
  inject,
  onCleanup,
  provide,
  type InjectionKey,
} from './composables/context';
// Props/Attributes
export { prop, type PropOptions } from './composables/props';
// Element refs
export { ref, type Ref } from './composables/ref';
// Slots
export {
  defaultSlot,
  slot,
} from './composables/slots';
// Styling (with CSP support)
export { createStyleElement, css, type CSSResult } from './composables/style';

// ============================================
// Testing
// ============================================

// Complete testing toolkit
export {
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
  // Types
  type ComponentFixture,
} from './test/trial';
