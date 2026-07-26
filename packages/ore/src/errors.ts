import { error as logError } from './_dev';

// ─── Structured error types ───────────────────────────────────────────────────

/** Base class for all Ore errors. Use `instanceof OreError` to catch any Ore-originated error. */
export class OreError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is OreError {
    return err instanceof OreError;
  }
}

/** Thrown when Ore API is called incorrectly (e.g. outside setup, duplicate define, invalid prop). */
export class OreApiError extends OreError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when an internal invariant fails — e.g. compiled template metadata no
 * longer matching the DOM it was cloned from. Distinct from `OreApiError`: this
 * is never the caller's fault, it signals a bug in ore itself. See `invariant()`.
 */
export class OreInternalError extends OreError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * The phase in which a component error occurred.
 * - `'setup'` — synchronous setup() threw
 * - `'async-setup'` — async setup() promise rejected
 * - `'mounted'` — an onMounted callback threw
 * - `'form-reset'` — an onFormReset callback threw
 * - `'each-reconcile'` — `each()` failed to reconcile a list update (e.g. duplicate keys)
 */
export type OreErrorPhase = 'async-setup' | 'each-reconcile' | 'form-reset' | 'mounted' | 'setup';

/**
 * Structured error thrown by the Ore runtime when component setup fails.
 * Provides component name and original cause for debugging.
 */
export class OreLifecycleError extends OreError {
  readonly component: string;
  readonly phase: OreErrorPhase;

  constructor(message: string, options: { cause: Error; component: string; phase: OreErrorPhase }) {
    super(message, { cause: options.cause });
    this.component = options.component;
    this.phase = options.phase;
  }
}

/**
 * Report a runtime error via the ore:error event and console.
 *
 * `target` only needs to be an `EventTarget` (not specifically an `HTMLElement`) — component
 * lifecycle errors dispatch on the host element, but non-lifecycle failures (e.g. `each()`
 * reconciliation, which has no single "component" to attribute the error to) dispatch on
 * whatever live DOM node is available, such as the directive's own anchor `Comment`. Either way
 * the event still bubbles and crosses shadow boundaries (`composed: true`), so a listener on
 * `document`/`window` observes every report regardless of where it originated.
 *
 * The console log (via `_dev.ts`'s `error()`) is still dev-gated like the rest of the package's
 * console diagnostics, but the `ore:error` DOM event dispatch below is **not** — it fires in
 * every build, so consumers always have a way to observe runtime failures programmatically even
 * when console output is stripped in production.
 */
export function reportRuntimeError(error: OreLifecycleError, target: EventTarget): void {
  logError(`<${error.component}> setup error (phase: ${error.phase}):`, error.cause);

  target.dispatchEvent(
    new CustomEvent('ore:error', {
      bubbles: true,
      composed: true,
      detail: error,
    }),
  );
}

// ─── Error message constants ─────────────────────────────────────────────────

/** Thrown by `flush()` in the testing sub-path when pending component work doesn't settle within the timeout. */
export class OreTimeoutError extends OreError {}

export const ORE_ERRORS = {
  defineDuplicate: (tag: string): string => `define('${tag}') called twice — custom element already registered`,
  defineFieldRequiresFormAssociated: (tag: string): string =>
    `useField() requires define('${tag}', { formAssociated: true })`,
  defineRequiresTag: 'define() requires a tag name',
  eachDuplicateKey: (key: string, index: number): string => `each() received duplicate key "${key}" at index ${index}`,
  injectStrictFailed: (key: string, tag: string): string => `injectStrict() could not resolve key "${key}" in <${tag}>`,
  invalidDynamicTagName: (tagName: string): string =>
    `html\`...\`: dynamic tag name "${tagName}" is not a valid HTML element name`,
  invariantViolated: (message: string): string => `invariant violated: ${message}`,
  lifecycleOutsideSetup: 'Lifecycle hooks must be called during component setup',
  mismatchedDynamicCloseTag: 'html`...`: dynamic closing tag has no matching dynamic opening tag',
  propInvalidReflect: 'Structured props cannot use reflect:true — use prop.json() with reflect:false',
  validationFailed: (tag: string, errors: string[]): string => `Validation failed for <${tag}>:\n${errors.join('\n')}`,
} as const;

/**
 * Assert an internal invariant that must always hold — e.g. compiled template
 * metadata staying in sync with the DOM it was cloned from. A failed invariant
 * means a bug in ore itself, never user input, so it throws `OreInternalError`
 * unconditionally (every build, never gated like `_dev.ts`'s `warn()`).
 *
 * Narrowing caveat: `asserts condition` only narrows the exact expression
 * passed in. Assign to a local `const` first — `invariant(el.parentNode, msg)`
 * does not narrow later reads of `el.parentNode`.
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new OreInternalError(ORE_ERRORS.invariantViolated(message));
}
