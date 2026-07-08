import type { DialogCloseReason, OverlayOpenDetail } from '../../headless';

export type CommandPaletteItemInput = {
  disabled?: boolean;
  /** Group heading the item is rendered under. Items sharing a group are clustered together. */
  group?: string;
  /** Lucide icon name (e.g. `"file-plus"`), rendered via `ore-icon` at the start of the row. */
  icon?: string;
  /** Extra search terms matched against the query in addition to the label. */
  keywords?: string[];
  label?: string;
  /**
   * Display-only shortcut hint rendered at the end of the row, one `<kbd>` per key — separate
   * keys with `+` (e.g. `"⌘+S"`). Purely visual — not bound to a live key handler.
   */
  shortcut?: string;
  value: string;
};

export type CommandPaletteItem = {
  disabled: boolean;
  group?: string;
  icon?: string;
  keywords: string[];
  label: string;
  shortcut?: string;
  value: string;
};

export type CommandPaletteSelectDetail = {
  item: CommandPaletteItem;
  label: string;
  value: string;
};

export type OreCommandPaletteEvents = {
  close: { reason: DialogCloseReason };
  open: OverlayOpenDetail;
  search: { query: string };
  select: CommandPaletteSelectDetail;
};

export type OreCommandPaletteProps = {
  /** Text shown when no item matches the current query. */
  'empty-text'?: string;
  /** JS items array — alternative or supplement to slotted `<ore-command-palette-item>` elements. */
  items?: CommandPaletteItemInput[];
  /** Keep the palette open after an item is selected. Default: closes on select. */
  'keep-open-on-select'?: boolean;
  /** Accessible label for the dialog (also the visually-hidden heading read by screen readers). */
  label?: string;
  /** Shows a loading row below the search input (e.g. while results are fetched asynchronously). */
  loading?: boolean;
  /** Disables built-in client-side filtering — use when `items` is already filtered server-side. */
  'no-filter'?: boolean;
  /** Controls the open state of the palette. */
  open?: boolean;
  /** Placeholder text for the search input. */
  placeholder?: string;
  /**
   * Global keyboard shortcut (in `@vielzeug/keymap` syntax, e.g. `"mod+k"`) that toggles the
   * palette open/closed from anywhere on the page. Set to an empty string to disable — useful
   * when the host application already manages its own trigger and shortcut.
   */
  shortcut?: string;
};

export type OreCommandPaletteItemProps = {
  disabled?: boolean;
  group?: string;
  icon?: string;
  /** Explicit label text; falls back to the element's text content. */
  label?: string;
  shortcut?: string;
  value?: string;
};
