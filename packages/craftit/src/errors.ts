import type { ComponentPhase } from './lifecycle';

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURED ERROR TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type CraftitErrorKind = 'setup' | 'binding' | 'prop' | 'context' | 'cleanup' | 'validation';

/**
 * Structured error envelope for Craftit runtime errors.
 * Provides full context for debugging and programmatic error handling.
 */
export type CraftitRuntimeError = {
  /** Original error or error cause */
  cause: Error;
  /** Unique error code for programmatic handling (e.g., 'SETUP_FAILED') */
  code: string;
  /** Component tag name (e.g., 'my-component') */
  component: string;
  /** Optional: recovery hint for developer */
  hint?: string;
  /** Error category */
  kind: CraftitErrorKind;
  /** Operation name (e.g., 'connectedCallback', 'setAttrBinding', 'parseBoolProp') */
  operation: string;
  /** Component's lifecycle phase when error occurred */
  phase: ComponentPhase;
};

/**
 * Create a structured Craftit error.
 *
 * @example
 * ```ts
 * const error = createRuntimeError({
 *   code: 'SETUP_FAILED',
 *   kind: 'setup',
 *   phase: ComponentPhase.SETUP_RUNNING,
 *   component: this.localName,
 *   operation: 'connectedCallback',
 *   cause: originalError,
 *   hint: 'Check component setup function and prop definitions',
 * });
 * ```
 */
export function createRuntimeError(input: {
  cause: Error;
  code: string;
  component: string;
  hint?: string;
  kind: CraftitErrorKind;
  operation: string;
  phase: ComponentPhase;
}): CraftitRuntimeError {
  return {
    cause: input.cause,
    code: input.code,
    component: input.component,
    hint: input.hint,
    kind: input.kind,
    operation: input.operation,
    phase: input.phase,
  };
}

/**
 * Report a structured error via the craftit:error event and console.
 * The event carries the full structured error envelope.
 */
export function reportRuntimeError(error: CraftitRuntimeError, element: HTMLElement): void {
  const message = `[${error.code}] <${error.component}> ${error.kind} error during ${error.operation} (phase: ${error.phase})`;

  console.error(message, {
    code: error.code,
    error: error.cause,
    hint: error.hint,
    kind: error.kind,
    operation: error.operation,
    phase: error.phase,
  });

  element.dispatchEvent(
    new CustomEvent('craftit:error', {
      bubbles: true,
      composed: true,
      detail: error,
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR MESSAGE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const CRAFTIT_ERRORS = {
  cleanupFailed: 'One or more cleanup callbacks failed during dispose',
  defineDuplicate: (tag: string): string => `define('${tag}') was called more than once`,
  defineFieldRequiresFormAssociated: (tag: string): string =>
    `defineField() requires define('${tag}', { formAssociated: true })`,
  defineRequiresTag: 'define() requires a non-empty tag name',
  eachDuplicateKey: (key: string, index: number): string => `each() received duplicate key "${key}" at index ${index}`,
  injectStrictFailed: (key: string, tag: string): string => `injectStrict() could not resolve key "${key}" in <${tag}>`,
  lifecycleOutsideSetup: 'Lifecycle hooks must be called synchronously during component setup',
  propInvalidReflect: 'Structured prop defaults cannot use reflect:true. Set reflect:false and sync explicitly.',
  styleReplaceFailed: 'Style sheet replace failed',
  unhandledComponentError: (tag: string): string => `<${tag}> threw an unhandled error during setup`,
  validationFailed: (tag: string, errors: string[]): string => `Validation failed for <${tag}>:\n${errors.join('\n')}`,
} as const;
