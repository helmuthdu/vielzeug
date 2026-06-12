import type { ComponentPhase } from './types';

// ─── Structured error types ───────────────────────────────────────────────────

/**
 * Structured error thrown by the Craft runtime when component setup fails.
 * Provides component name and original cause for debugging.
 */
export class CraftitError extends Error {
  readonly component: string;
  readonly phase: ComponentPhase;

  constructor(message: string, options: { cause: Error; component: string; phase: ComponentPhase }) {
    super(`[@vielzeug/craft] ${message}`, { cause: options.cause });
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.component = options.component;
    this.phase = options.phase;
  }

  static is(err: unknown): err is CraftitError {
    return err instanceof CraftitError;
  }
}

/**
 * Report a runtime error via the craft:error event and console.
 */
export function reportRuntimeError(error: CraftitError, element: HTMLElement): void {
  console.error(`[craft] <${error.component}> setup error (phase: ${error.phase}):`, error.cause);

  element.dispatchEvent(
    new CustomEvent('craft:error', {
      bubbles: true,
      composed: true,
      detail: error,
    }),
  );
}

// ─── Error message constants ─────────────────────────────────────────────────

export const CRAFTIT_ERRORS = {
  defineDuplicate: (tag: string): string =>
    `define('${tag}') was called more than once. ` +
    `This is usually caused by importing the same component file via two different module paths (aliasing or HMR). ` +
    `Ensure each custom element tag is registered exactly once.`,
  defineFieldRequiresFormAssociated: (tag: string): string =>
    `defineField() requires define('${tag}', { formAssociated: true })`,
  defineRequiresTag: 'define() requires a non-empty tag name',
  eachDuplicateKey: (key: string, index: number): string => `each() received duplicate key "${key}" at index ${index}`,
  injectStrictFailed: (key: string, tag: string): string => `injectStrict() could not resolve key "${key}" in <${tag}>`,
  lifecycleOutsideSetup: 'Lifecycle hooks must be called synchronously during component setup',
  propInvalidReflect: 'Structured prop defaults cannot use reflect:true. Use prop.json() with reflect:false instead.',
  validationFailed: (tag: string, errors: string[]): string => `Validation failed for <${tag}>:\n${errors.join('\n')}`,
} as const;
