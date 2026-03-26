import { computed, isSignal, type ReadonlySignal } from '@vielzeug/stateit';

import {
  CF_ID_ATTR,
  EACH_SIGNAL,
  extractResult,
  htmlResult,
  isHtmlResult,
  type Binding,
  type Directive,
  type HTMLResult,
} from '../core/internal';
import { escapeHtml } from '../core/utilities';

const ATTR_ID_RE = new RegExp(`${CF_ID_ATTR}="(\\d+)"`, 'g');

/* immutable — shared singleton for empty static lists */
const EMPTY = htmlResult('');
const NO_BINDINGS: Binding[] = [];

const toResultEntry = (value: string | HTMLResult, c: { n: number }): { bindings: Binding[]; html: string } =>
  isHtmlResult(value) ? renumber(value, c) : { bindings: NO_BINDINGS, html: escapeHtml(value) };

const toHtmlResult = (value: string | HTMLResult): HTMLResult =>
  isHtmlResult(value) ? value : htmlResult(escapeHtml(value));

function renumber(res: HTMLResult, c: { n: number }): { bindings: Binding[]; html: string } {
  const map = new Map<string, string>();
  const nb: Binding[] = [];

  for (const b of res.__bindings) {
    const oldId = b.uid;
    const newId = map.get(oldId) ?? String(c.n++);

    if (!map.has(oldId)) map.set(oldId, newId);

    nb.push({ ...b, uid: newId });
  }

  return {
    bindings: nb,
    html: res.__html
      // Re-map element binding ids.
      .replace(ATTR_ID_RE, (_, id) => `${CF_ID_ATTR}="${map.get(id) ?? id}"`)
      // Re-map numeric comment markers used by text/html placeholders.
      .replace(/<!--(\d+)-->/g, (_, id) => `<!--${map.get(id) ?? id}-->`),
  };
}

/** Render loop used by the reactive path (keys + rendered metadata required for reconciliation). */
function renderKeyed<T>(
  items: T[],
  template: (item: T, index: number) => string | HTMLResult,
  keyFn: (item: T, index: number) => string | number,
): {
  bindings: Binding[];
  html: string;
  keys: (string | number)[];
  rendered: Array<{ bindings: Binding[]; html: string }>;
} {
  let html = '';
  const allBindings: Binding[] = [];
  const keys: (string | number)[] = [];
  const rendered: Array<{ bindings: Binding[]; html: string }> = [];
  const c = { n: 0 };

  for (let i = 0; i < items.length; i++) {
    keys.push(keyFn(items[i], i));

    const entry = toResultEntry(template(items[i], i), c);

    html += entry.html;
    allBindings.push(...entry.bindings);
    rendered.push(entry);
  }

  return { bindings: allBindings, html, keys, rendered };
}

/** Render loop used by the static path — no key/reconciliation metadata needed. */
function renderStatic<T>(
  items: T[],
  template: (item: T, index: number) => string | HTMLResult,
): { bindings: Binding[]; html: string } {
  let html = '';
  const allBindings: Binding[] = [];
  const c = { n: 0 };

  for (let i = 0; i < items.length; i++) {
    const entry = toResultEntry(template(items[i], i), c);

    html += entry.html;
    allBindings.push(...entry.bindings);
  }

  return { bindings: allBindings, html };
}

/**
 * Options accepted by `each()`.
 */
export interface EachOptions<T> {
  /**
   * Key extractor for stable DOM reconciliation.
   * Receives the item and its **filtered** array index (after `select` is applied).
   *
   * Required when `source` is reactive (Signal/getter).
   * Optional for static arrays (render-once path).
   */
  key?: (item: T, index: number) => string | number;
  /**
   * Filter predicate. Receives the item and its **original** array index.
   * Only items for which `select` returns `true` are rendered.
   *
   * @example
   * each(items, item => html`<li>${item.name}</li>`, undefined, { select: item => item.active })
   */
  select?: (item: T, index: number) => boolean;
}

type ReactiveSource<T> = ReadonlySignal<T[]> | (() => T[]);
type EachSignalResult = Directive & {
  [EACH_SIGNAL]: ReadonlySignal<{
    bindings: Binding[];
    html: string;
    items?: Array<{ bindings: Binding[]; html: string }>;
    keys?: (string | number)[];
  }>;
};

/**
 * Renders a reactive list with keyed DOM reconciliation for efficient updates.
 * Use inside `html` tagged templates.
 *
 * For reactive sources (Signal/getter), you must provide a stable `key` function.
 *
 * For dynamic lists with click handlers, prefer event delegation on a parent node
 * (`@click` + `closest(...)`) over per-item handlers inside `each()`.
 *
 * @example
 * import { each } from '@vielzeug/craftit/directives';
 *
 * // Static array (key optional):
 * html`${each([1, 2, 3], item => html`<li>${item}</li>`)}`
 *
 * // Reactive source (key required):
 * html`${each(items, item => html`<li>${item.name}</li>`, undefined, { key: item => item.id })}`
 *
 * // Full example:
 * html`${each(items, item => html`<li>${item.name}</li>`, () => html`<p>No items</p>`, {
 *   key: item => item.id,
 *   select: item => item.active,
 * })}`
 */
export function each<T>(
  source: T[],
  template: (item: T, index: number) => string | HTMLResult,
  empty?: () => string | HTMLResult,
  options?: EachOptions<T>,
): HTMLResult;
export function each<T>(
  source: ReactiveSource<T>,
  template: (item: T, index: number) => string | HTMLResult,
  options: EachOptions<T> & { key: (item: T, index: number) => string | number },
): EachSignalResult;
export function each<T>(
  source: ReactiveSource<T>,
  template: (item: T, index: number) => string | HTMLResult,
  empty: (() => string | HTMLResult) | undefined,
  options: EachOptions<T> & { key: (item: T, index: number) => string | number },
): EachSignalResult;
export function each<T>(
  source: T[] | ReactiveSource<T>,
  template: (item: T, index: number) => string | HTMLResult,
  emptyOrOptions?: (() => string | HTMLResult) | EachOptions<T>,
  options?: EachOptions<T>,
): HTMLResult | EachSignalResult {
  const hasEmptyFn = typeof emptyOrOptions === 'function';
  const empty = hasEmptyFn ? emptyOrOptions : undefined;
  const resolvedOptions = (hasEmptyFn ? options : (options ?? emptyOrOptions)) ?? {};
  const select = resolvedOptions.select;

  if (Array.isArray(source)) {
    const filtered = select ? source.filter(select) : source;

    if (!filtered.length) {
      if (empty) {
        const er = extractResult(toHtmlResult(empty()));

        return htmlResult(er.html, er.bindings);
      }

      return EMPTY;
    }

    const { bindings, html } = renderStatic(filtered, template);

    return htmlResult(html, bindings);
  }

  const keyFn = resolvedOptions.key;

  if (!keyFn) {
    throw new Error('[craftit:each] Reactive each() requires options.key for stable reconciliation.');
  }

  const getItems = isSignal(source) ? () => (source as ReadonlySignal<T[]>).value : (source as () => T[]);

  return {
    [EACH_SIGNAL]: computed(() => {
      const raw = getItems();
      const filtered = select ? raw.filter(select) : raw;

      if (!filtered.length) {
        const er = empty ? toHtmlResult(empty()) : undefined;

        return er ? { ...extractResult(er), items: [], keys: [] } : { bindings: [], html: '', items: [], keys: [] };
      }

      const { bindings, html, keys, rendered } = renderKeyed(filtered, template, keyFn);

      return { bindings, html, items: rendered, keys };
    }),
  };
}
