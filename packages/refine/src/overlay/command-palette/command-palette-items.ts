import { warn } from '../../_dev';
import type { CommandPaletteItem, CommandPaletteItemInput } from './command-palette.types';

// ── Grouped row model ─────────────────────────────────────────────────────────
// Items are bucketed by `group` (preserving first-seen order) into clusters, each
// holding the item's position in the flat filtered list (`idx`). The listbox
// renders one cluster per bucket — a heading plus its rows, wrapped in a
// `role="group"` container — while keyboard navigation stays index-addressable
// against the flat visible list, never against the DOM.

export type CommandPaletteRow = { idx: number; item: CommandPaletteItem };

export type CommandPaletteGroup = { group?: string; rows: CommandPaletteRow[] };

/** A non-empty `children` list makes an item a category row rather than a command. */
export function isCategory(item: CommandPaletteItem): boolean {
  return item.children.length > 0;
}

const ITEM_TAG = 'ore-command-palette-item';

const NESTING_WARNING = `ore-command-palette: categories nest one level only; nested <${ITEM_TAG}> children of a category are ignored`;

type ItemFields = Omit<CommandPaletteItem, 'children'>;

function parseItemFields(el: Element): ItemFields {
  return {
    disabled: el.hasAttribute('disabled'),
    group: el.getAttribute('group') ?? undefined,
    icon: el.getAttribute('icon') ?? undefined,
    keywords: (el.getAttribute('keywords') ?? '')
      .split(',')
      .map((term) => term.trim())
      .filter(Boolean),
    label:
      el.getAttribute('label') ||
      [...el.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent?.trim())
        .filter(Boolean)
        .join(' ') ||
      '',
    shortcut: el.getAttribute('shortcut') ?? undefined,
    value: el.getAttribute('value') ?? '',
  };
}

/**
 * Reads one `<ore-command-palette-item>`. `isChild` marks a second-level item:
 * categories nest one level, so its own nested items are dropped with a warning
 * rather than rendered as a row that could never open.
 */
function parseItemElement(el: Element, isChild: boolean): CommandPaletteItem {
  const nested = [...el.children].filter((child) => child.localName === ITEM_TAG);

  if (isChild) {
    if (nested.length > 0) warn(NESTING_WARNING);

    return { ...parseItemFields(el), children: [] };
  }

  return { ...parseItemFields(el), children: nested.map((child) => parseItemElement(child, true)) };
}

export function parseSlottedItems(elements: Element[]): CommandPaletteItem[] {
  return elements.filter((el) => el.localName === ITEM_TAG).map((el) => parseItemElement(el, false));
}

/**
 * Splits a display-only shortcut hint into individual keys so each can be rendered in its
 * own `<kbd>`. Keys are separated with `+` (e.g. `"⌘+N"` → `["⌘", "N"]`); a shortcut with no
 * `+` renders as a single key, unchanged. A literal `+` key can't be represented this way :
 * spell it out instead (e.g. `"Ctrl+Plus"`).
 */
export function splitShortcutKeys(shortcut: string): string[] {
  return shortcut
    .split('+')
    .map((key) => key.trim())
    .filter(Boolean);
}

function normalizeFields(input: CommandPaletteItemInput): ItemFields {
  return {
    disabled: Boolean(input.disabled),
    group: input.group,
    icon: input.icon,
    keywords: input.keywords ?? [],
    label: input.label ?? input.value,
    shortcut: input.shortcut,
    value: input.value,
  };
}

export function normalizeItem(input: CommandPaletteItemInput): CommandPaletteItem {
  return {
    ...normalizeFields(input),
    children: (input.children ?? []).map((child) => {
      if (child.children?.length) {
        warn(
          `ore-command-palette: category "${input.value}" nests one level only; "${child.value}" children are ignored`,
        );
      }

      return { ...normalizeFields(child), children: [] };
    }),
  };
}

/** Matches a query against one item's own label, value, keywords, or group name. */
function matchesQuery(item: CommandPaletteItem, normalizedQuery: string): boolean {
  return (
    item.label.toLowerCase().includes(normalizedQuery) ||
    item.value.toLowerCase().includes(normalizedQuery) ||
    item.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery)) ||
    item.group?.toLowerCase().includes(normalizedQuery) === true
  );
}

/**
 * Matches a query against a flat list of items by label, value, keywords, or group
 * name. A group match keeps the whole group's items, so typing a section name (e.g.
 * "file") surfaces everything filed under it, not just rows whose own text repeats it.
 */
export function filterItems(items: CommandPaletteItem[], query: string, noFilter: boolean): CommandPaletteItem[] {
  if (noFilter) return items;

  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return items;

  return items.filter((item) => matchesQuery(item, normalizedQuery));
}

/**
 * Global search for the root view: categories never appear as rows while a query is
 * typed, so their leaves are searched in place and returned flat. A category whose own
 * text matches contributes all of its children, which keeps a category name searchable
 * without hiding a command behind a menu level.
 */
export function searchItems(items: CommandPaletteItem[], query: string): CommandPaletteItem[] {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return items;

  const matched: CommandPaletteItem[] = [];

  for (const item of items) {
    if (!isCategory(item)) {
      if (matchesQuery(item, normalizedQuery)) matched.push(item);

      continue;
    }

    const categoryMatches = matchesQuery(item, normalizedQuery);

    for (const child of item.children) {
      if (categoryMatches || matchesQuery(child, normalizedQuery)) matched.push(child);
    }
  }

  return matched;
}

/** Buckets items by `group` (first-seen order) into clusters with flat-list indices. */
export function buildGroups(items: CommandPaletteItem[]): CommandPaletteGroup[] {
  const buckets = new Map<string | undefined, CommandPaletteRow[]>();

  items.forEach((item, idx) => {
    let rows = buckets.get(item.group);

    if (!rows) {
      rows = [];
      buckets.set(item.group, rows);
    }

    rows.push({ idx, item });
  });

  return [...buckets].map(([group, rows]) => ({ group, rows }));
}
