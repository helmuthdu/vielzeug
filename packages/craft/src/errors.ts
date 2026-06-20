import { isDev, issue } from './_warn';

// ─── Structured error types ───────────────────────────────────────────────────

/**
 * The phase in which a component error occurred.
 * - `'setup'` — synchronous setup() threw
 * - `'async-setup'` — async setup() promise rejected
 * - `'mounted'` — an onMounted callback threw
 */
export type CraftErrorPhase = 'async-setup' | 'mounted' | 'setup';

/**
 * Structured error thrown by the Craft runtime when component setup fails.
 * Provides component name and original cause for debugging.
 */
export class CraftError extends Error {
  readonly component: string;
  readonly phase: CraftErrorPhase;

  constructor(message: string, options: { cause: Error; component: string; phase: CraftErrorPhase }) {
    super(`[@vielzeug/craft] ${message}`, { cause: options.cause });
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.component = options.component;
    this.phase = options.phase;
  }

  static is(err: unknown): err is CraftError {
    return err instanceof CraftError;
  }
}

/**
 * Report a runtime error via the craft:error event and console.
 */
export function reportRuntimeError(error: CraftError, element: HTMLElement): void {
  if (isDev) issue(`<${error.component}> setup error (phase: ${error.phase}):`, error.cause);

  element.dispatchEvent(
    new CustomEvent('craft:error', {
      bubbles: true,
      composed: true,
      detail: error,
    }),
  );
}

// ─── Error message constants ─────────────────────────────────────────────────

export const CRAFT_ERRORS = {
  defineDuplicate: (tag: string): string => `define('${tag}') called twice — custom element already registered`,
  defineFieldRequiresFormAssociated: (tag: string): string =>
    `useField() requires define('${tag}', { formAssociated: true })`,
  defineRequiresTag: 'define() requires a tag name',
  eachDuplicateKey: (key: string, index: number): string => `each() received duplicate key "${key}" at index ${index}`,
  injectStrictFailed: (key: string, tag: string): string => `injectStrict() could not resolve key "${key}" in <${tag}>`,
  lifecycleOutsideSetup: 'Lifecycle hooks must be called during component setup',
  propInvalidReflect: 'Structured props cannot use reflect:true — use prop.json() with reflect:false',
  validationFailed: (tag: string, errors: string[]): string => `Validation failed for <${tag}>:\n${errors.join('\n')}`,
} as const;
