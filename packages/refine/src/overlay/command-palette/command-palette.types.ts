import type { OverlayOpenChangeDetail } from '../../core';

export type CommandPaletteItemInput = {
  /**
   * Child commands. A non-empty list turns this item into a category row: it renders as a
   * single row (chevron + item count) that opens on `ArrowRight`/`Enter` instead of selecting.
   * Categories nest one level only: a child's own `children` are ignored (dev warning).
   */
  children?: CommandPaletteItemInput[];
  disabled?: boolean;
  /** Group heading the item is rendered under. Items sharing a group are clustered together. */
  group?: string;
  /** Registered icon name (e.g. `"file-plus"`), rendered via `ore-icon` at the start of the row. */
  icon?: string;
  /** Extra search terms matched against the query in addition to the label. */
  keywords?: string[];
  label?: string;
  /**
   * Display-only shortcut hint rendered at the end of the row, one `<kbd>` per key: separate
   * keys with `+` (e.g. `"⌘+S"`). Purely visual: not bound to a live key handler. A literal
   * `+` key itself isn't representable this way: spell it out instead (e.g. `"Ctrl+Plus"`).
   */
  shortcut?: string;
  value: string;
};

export type CommandPaletteItem = {
  /** Child commands; non-empty means this item is a category row. Always empty on a child. */
  children: CommandPaletteItem[];
  disabled: boolean;
  group?: string;
  icon?: string;
  keywords: string[];
  label: string;
  shortcut?: string;
  value: string;
};

export type CommandPaletteCategoryOpenDetail = {
  /** Number of child commands the category opens to. */
  count: number;
  label: string;
  value: string;
};

export type CommandPaletteSelectDetail = {
  item: CommandPaletteItem;
  label: string;
  value: string;
};

/**
 * The row the palette currently points at. `item` is `undefined` when the list is empty or the
 * palette has no focus, which is also when a `preview` slot should be emptied by its owner.
 */
export type CommandPaletteActiveChangeDetail = {
  item?: CommandPaletteItem;
  label: string;
  value: string;
};

export type OreCommandPaletteEvents = {
  'active-change': CommandPaletteActiveChangeDetail;
  /** Fired when a category row is opened (`ArrowRight`/`Enter`/click). Entering a category is navigation, never `select`. */
  'category-open': CommandPaletteCategoryOpenDetail;
  'open-change': OverlayOpenChangeDetail;
  search: { query: string };
  select: CommandPaletteSelectDetail;
};

type CommandPaletteBackdrop = 'opaque' | 'blur' | 'transparent';

export type OreCommandPaletteProps = {
  /** Backdrop style: 'opaque' (default): dimming veil only; 'blur': dimming veil + blur; 'transparent': no overlay */
  backdrop?: CommandPaletteBackdrop;
  /** Label of the back row shown above an opened category. Default: `"All commands"`. */
  'back-text'?: string;
  /** Initial uncontrolled open state. Ignored when `open` is set. */
  'default-open'?: boolean;
  /** Text shown when no item matches the current query. */
  'empty-text'?: string;
  /** JS items array: alternative or supplement to slotted `<ore-command-palette-item>` elements. */
  items?: CommandPaletteItemInput[];
  /** Keep the palette open after an item is selected. Default: closes on select. */
  'keep-open-on-select'?: boolean;
  /** Accessible label for the dialog (also the visually-hidden heading read by screen readers). */
  label?: string;
  /** Shows a loading row below the search input (e.g. while results are fetched asynchronously). */
  loading?: boolean;
  /** Disables built-in client-side filtering: use when `items` is already filtered server-side. */
  'no-filter'?: boolean;
  /** Controls the open state of the palette. */
  open?: boolean;
  /** Placeholder text for the search input. */
  placeholder?: string;
  /**
   * Global keyboard shortcut (in `@vielzeug/keymap` syntax, e.g. `"mod+k"`) that toggles the
   * palette open/closed from anywhere on the page. Set to an empty string to disable: useful
   * when the host application already manages its own trigger and shortcut.
   */
  shortcut?: string;
  /**
   * Milliseconds the typed text waits before it reaches the list and the `search` event, so a
   * fast typist settles on one result set instead of reflowing the list on every keystroke.
   * Default `0`: filtering and `search` fire on each keystroke. The input always shows every
   * keystroke immediately, and `Enter` still chooses the row on screen.
   */
  'search-debounce'?: number;
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
