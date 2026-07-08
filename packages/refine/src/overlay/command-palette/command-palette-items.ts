import type { CommandPaletteItem, CommandPaletteItemInput } from './command-palette.types';

// ── Flat row model ────────────────────────────────────────────────────────────
// Items are grouped by `group` (preserving first-seen order) and flattened into a
// single list of rows so the listbox can render group headings inline while
// keyboard navigation still walks a single, index-addressable sequence.

export type CommandPaletteRow =
  { group: string; type: 'group' } | { idx: number; item: CommandPaletteItem; type: 'item' };

export function parseSlottedItems(elements: Element[]): CommandPaletteItem[] {
  return elements
    .filter((el) => el.localName === 'ore-command-palette-item')
    .map((el) => ({
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
    }));
}

/**
 * Splits a display-only shortcut hint into individual keys so each can be rendered in its
 * own `<kbd>`. Keys are separated with `+` (e.g. `"⌘+N"` → `["⌘", "N"]`); a shortcut with no
 * `+` renders as a single key, unchanged. A literal `+` key can't be represented this way —
 * spell it out instead (e.g. `"Ctrl+Plus"`).
 */
export function splitShortcutKeys(shortcut: string): string[] {
  return shortcut
    .split('+')
    .map((key) => key.trim())
    .filter(Boolean);
}

export function normalizeItem(input: CommandPaletteItemInput): CommandPaletteItem {
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

export function filterItems(items: CommandPaletteItem[], query: string, noFilter: boolean): CommandPaletteItem[] {
  if (noFilter) return items;

  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return items;

  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(normalizedQuery) ||
      item.value.toLowerCase().includes(normalizedQuery) ||
      item.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery)),
  );
}

/** Groups items by `group` (first-seen order) and flattens into index-addressable rows. */
export function buildRows(items: CommandPaletteItem[]): CommandPaletteRow[] {
  const groups = new Map<string | undefined, CommandPaletteItem[]>();

  for (const item of items) {
    const key = item.group;
    let bucket = groups.get(key);

    if (!bucket) {
      bucket = [];
      groups.set(key, bucket);
    }

    bucket.push(item);
  }

  const rows: CommandPaletteRow[] = [];
  let idx = 0;

  for (const [group, groupItems] of groups) {
    if (group !== undefined) rows.push({ group, type: 'group' });

    for (const item of groupItems) rows.push({ idx: idx++, item, type: 'item' });
  }

  return rows;
}
