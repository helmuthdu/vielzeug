import { computed, effect, fromSubscribable, type Readable, type Signal, signal } from '@vielzeug/ripple';
import { createMediaQuery } from '@vielzeug/sentinel';

/** User-selectable theme: an explicit mode, or follow the OS. */
export type ThemePreference = 'dark' | 'light' | 'system';

/** The mode actually in effect after resolving `system` against the OS preference. */
export type ResolvedTheme = 'dark' | 'light';

export interface ThemeControllerOptions {
  /** Starting preference. @default 'system' */
  readonly initial?: ThemePreference;
  /** Element that carries the theme classes and `color-scheme`. @default document.documentElement */
  readonly root?: HTMLElement;
  /** Window whose `matchMedia` backs `system`. @default globalThis */
  readonly target?: Window;
}

/**
 * Owns the light/dark/system theme for the document: a reactive preference, the effective
 * (resolved) mode, and the DOM application refine's `styles/theme.css` expects: the `.dark`
 * class plus the `color-scheme` property on the root element, so every `light-dark()` token
 * resolves to the right branch.
 *
 * The controller does NOT persist the preference or expose an accent color: those are consumer
 * concerns (wire `watch(controller.preference, save)` for persistence; set `--color-primary-hue`
 * yourself). It only tracks the OS `prefers-color-scheme` while in `system` mode and applies the
 * result.
 */
export interface ThemeController {
  readonly disposalSignal: AbortSignal;
  /** Stops applying and releases the OS listener. */
  dispose(): void;
  readonly disposed: boolean;
  /** The user's selection. Write through {@link setPreference} or `preference.value = …`. */
  readonly preference: Signal<ThemePreference>;
  /** The effective mode after resolving `system`. */
  readonly resolved: Readable<ResolvedTheme>;
  setPreference(preference: ThemePreference): void;
  [Symbol.dispose](): void;
}

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
let switchSequence = 0;

function withoutTransitions(root: HTMLElement, apply: () => void): void {
  const styles: HTMLStyleElement[] = [];
  const previous = root.getAttribute('data-theme-switching');
  const addStyle = (target: HTMLElement | ShadowRoot, selector: string): void => {
    const style = root.ownerDocument.createElement('style');
    // Theme changes must also override author transitions and pseudo-elements.
    style.textContent = `${selector} { transition: none !important; }`;
    target.appendChild(style);
    styles.push(style);
  };
  const visit = (element: Element): void => {
    if (element.shadowRoot) {
      addStyle(element.shadowRoot, ':host, *, *::before, *::after');
      for (const child of element.shadowRoot.children) visit(child);
    }
    for (const child of element.children) visit(child);
  };

  try {
    const id = String(++switchSequence);
    const scope = `[data-theme-switching="${id}"]`;
    root.setAttribute('data-theme-switching', id);
    addStyle(root, `${scope}, ${scope} *, ${scope}::before, ${scope}::after, ${scope} *::before, ${scope} *::after`);
    visit(root);
    apply();
    // Commit the new palette while transitions are disabled, including shadow descendants.
    void root.offsetHeight;
  } finally {
    for (const style of styles) style.remove();
    if (previous === null) root.removeAttribute('data-theme-switching');
    else root.setAttribute('data-theme-switching', previous);
  }
}

/** Creates a document theme controller. Call once at app startup. */
export function createThemeController(options: ThemeControllerOptions = {}): ThemeController {
  const root = options.root ?? document.documentElement;
  const controller = new AbortController();
  const preference = signal<ThemePreference>(options.initial ?? 'system');

  const hasMatchMedia = typeof (options.target ?? globalThis).matchMedia === 'function';
  const systemDark = hasMatchMedia
    ? fromSubscribable(createMediaQuery(DARK_SCHEME_QUERY, { signal: controller.signal, target: options.target }))
    : null;

  const resolved = computed<ResolvedTheme>(() => {
    const selected = preference.value;
    if (selected !== 'system') return selected;
    return systemDark?.value.matches === true ? 'dark' : 'light';
  });

  const apply = effect(() => {
    const dark = resolved.value === 'dark';
    withoutTransitions(root, () => {
      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
    });
  });

  let disposed = false;

  return {
    disposalSignal: controller.signal,
    dispose() {
      if (disposed) return;
      disposed = true;
      apply.dispose();
      systemDark?.dispose();
      controller.abort();
    },
    get disposed() {
      return disposed;
    },
    preference,
    resolved,
    setPreference(next) {
      preference.value = next;
    },
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}
