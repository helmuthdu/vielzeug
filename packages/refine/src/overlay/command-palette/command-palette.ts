import { createKeymap } from '@vielzeug/keymap';
import { define, getHost, html, onCleanup, onEvent, onMounted, prop, ref, useEmit } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { warn } from '../../_dev';

import { announce, createListControl, lifecycleSignal, parseOptionalBool } from '../../core';
import { animateReflow } from '../../reflow';
import { useDialogControl } from '../shared/use-dialog';
import componentStyles from './command-palette.css?inline';
import type { CommandPaletteItem, OreCommandPaletteEvents, OreCommandPaletteProps } from './command-palette.types';
import {
  buildGroups,
  filterItems,
  isCategory,
  normalizeItem,
  parseSlottedItems,
  searchItems,
  splitShortcutKeys,
} from './command-palette-items';

export { ICON_TAG } from '../../content/icon/icon';
export { KEYBOARD_SHORTCUT_TAG } from '../../content/keyboard-key/keyboard-key';
export type { OreCommandPaletteEvents, OreCommandPaletteProps } from './command-palette.types';

/**
 * A pure data node describing one command. Never rendered directly: `ore-command-palette`
 * reads its attributes/text content and renders the visible row itself.
 *
 * @element ore-command-palette-item
 *
 * @attr {string} value - Value emitted by the `select` event and matched against the search query
 * @attr {string} label - Explicit label text; falls back to the element's text content
 * @attr {string} group - Group heading the item is clustered under
 * @attr {string} shortcut - Display-only keyboard hint rendered at the end of the row, one `<kbd>` per `+`-separated key (e.g. `"⌘+S"` renders two keycaps; a literal `+` key isn't representable: spell it out, e.g. `"Ctrl+Plus"`)
 * @attr {boolean} disabled - Excludes the item from keyboard navigation and selection
 *
 * Nested `<ore-command-palette-item>` elements turn this item into a category row that opens
 * on `ArrowRight`/`Enter` instead of selecting; nesting is one level only (deeper items are
 * ignored with a dev warning).
 *
 * @slot icon - Optional leading icon content
 *
 * @example
 * ```html
 * <ore-command-palette-item value="new-file" group="File" shortcut="⌘+N">New File</ore-command-palette-item>
 * ```
 */
export const COMMAND_PALETTE_ITEM_TAG = 'ore-command-palette-item' as const;
define(COMMAND_PALETTE_ITEM_TAG, {
  setup() {
    return html``;
  },
});

/**
 * A searchable, keyboard-driven list of commands presented in a centered modal :
 * the "⌘K" pattern popularized by editors and productivity apps. Built on the
 * native `<dialog>` element (focus trap, top-layer stacking, `Escape`-to-close)
 * and `@vielzeug/keymap` for the global shortcut that opens it.
 *
 * Items with nested items become category rows: one row with a chevron and a leaf
 * count that opens on `ArrowRight`/`Enter`/click, keeping the root list short.
 * Search stays global from the root: a typed query flattens category leaves into
 * one result list, so no command hides behind a category. Categories nest one level.
 *
 * @element ore-command-palette
 * @element ore-command-palette-item - Slotted command definition (place in default slot)
 *
 * @attr {boolean} open - Controls the open state of the palette
 * @attr {boolean} default-open - Initial uncontrolled open state
 * @attr {string} backdrop - Backdrop style: 'opaque' (default) | 'blur' | 'transparent'
 * @attr {string} back-text - Label of the back row shown above an opened category (default: "All commands")
 * @attr {string} label - Accessible label for the dialog (screen-reader-only heading)
 * @attr {string} placeholder - Placeholder text for the search input
 * @attr {string} shortcut - Global keyboard shortcut (keymap syntax) that toggles the palette. Default `"mod+k"`; set to `""` to disable
 * @attr {boolean} no-filter - Disable built-in client-side filtering (for server-driven search)
 * @attr {boolean} loading - Shows a loading row below the search input
 * @attr {string} empty-text - Message shown when no item matches the query
 * @attr {boolean} keep-open-on-select - Keep the palette open after an item is selected
 * @attr {number} search-debounce - Milliseconds a typed query waits before filtering the list and emitting `search` (default `0`: every keystroke)
 *
 * @fires active-change - Fired when the focused row changes (keyboard, hover, typing, open, close). detail: `{ value, label, item }`; `item` is `undefined` and `value` empty when no row is active
 * @fires category-open - Fired when a category row is opened (`ArrowRight`/`Enter`/click). detail: `{ value, label, count }`. Entering a category is navigation: `select` never carries a category value
 * @fires open-change - Fired when the palette state changes. detail: `{ open, reason }`
 * @fires search - Fired when the query reaches the list: on every keystroke, or after `search-debounce` settles it. detail: `{ query }`
 * @fires select - Fired when a command is chosen (click or `Enter`). detail: `{ value, label, item }`
 *
 * @slot - `<ore-command-palette-item>` elements (alternative/supplement to the `items` prop)
 * @slot preview - Optional detail panel rendered beside the list, shown while it has content. Pair it with `active-change` to preview the focused row
 *
 * @cssprop --command-palette-bg - Panel background color
 * @cssprop --command-palette-border-color - Panel border color
 * @cssprop --command-palette-radius - Panel border radius
 * @cssprop --command-palette-shadow - Panel drop shadow
 * @cssprop --command-palette-max-width - Maximum panel width
 * @cssprop --command-palette-backdrop-bg - Backdrop veil color (default: var(--overlay-veil))
 * @cssprop --command-palette-option-hover-bg - Item background on hover
 * @cssprop --command-palette-option-focus-bg - Item background when keyboard-focused
 * @cssprop --command-palette-group-sticky-bg - Background of the pinned group heading while it sticks (default: near-opaque var(--surface-overlay))
 * @cssprop --command-palette-preview-width - Preview panel width when the `preview` slot has content
 *
 * @part dialog - Dialog root container
 * @part panel - Panel container
 * @part input - Search input
 * @part listbox - Listbox of matching commands
 * @part preview - Preview panel shown beside the list
 *
 * @example
 * ```html
 * <ore-command-palette label="Command palette" placeholder="Type a command…">
 *   <ore-command-palette-item value="new-file" group="File" shortcut="⌘+N">New File</ore-command-palette-item>
 *   <ore-command-palette-item value="open-file" group="File" shortcut="⌘+O">Open File…</ore-command-palette-item>
 *   <ore-command-palette-item value="toggle-theme" group="View">Toggle Theme</ore-command-palette-item>
 * </ore-command-palette>
 * ```
 */
export const COMMAND_PALETTE_TAG = 'ore-command-palette' as const;

const COMMAND_PALETTE_BACKDROPS = ['opaque', 'blur', 'transparent'] as const;

define<OreCommandPaletteProps>(COMMAND_PALETTE_TAG, {
  props: {
    'back-text': prop.string('All commands'),
    backdrop: prop.oneOf(COMMAND_PALETTE_BACKDROPS),
    'default-open': prop.bool(false),
    'empty-text': prop.string('No results found.'),
    items: prop.data<OreCommandPaletteProps['items']>(),
    'keep-open-on-select': prop.bool(false),
    label: prop.string('Command palette'),
    loading: prop.bool(false),
    'no-filter': prop.bool(false),
    open: { default: undefined as boolean | undefined, parse: parseOptionalBool },
    placeholder: prop.string('Type a command or search…'),
    'search-debounce': prop.number(0),
    shortcut: prop.string('mod+k'),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreCommandPaletteEvents>();
    const abortSignal = lifecycleSignal(onCleanup);

    const dialogRef = ref<HTMLDialogElement>();
    const searchInputRef = ref<HTMLInputElement>();
    const listboxId = 'cmdk-listbox';

    let listboxEl: HTMLElement | null = null;

    // `query` is what the player has typed: it drives the input's own value and the
    // caret-ownership guards, and is never delayed, because a lagging copy would
    // rewrite the text under the caret. `appliedQuery` is the query the list and the
    // `search` event see, which can trail it by `search-debounce` milliseconds so a
    // fast typist settles on one result set instead of reflowing the list (and a
    // `no-filter` consumer's catalogue rebuild) on every keystroke.
    const query = signal('');
    const appliedQuery = signal('');

    // ── Items: slotted <ore-command-palette-item> elements, merged with the `items` prop ──
    // Items are pure data nodes (see `ore-command-palette-item`'s own doc comment): they're
    // never projected through a `<slot>`, just read directly off the host's light DOM. That
    // sidesteps `useSlots()`/`slotchange` entirely: a plain MutationObserver on the host
    // already covers everything `slotchange` would (an item added or removed) *and* the case
    // it can't: an already-assigned item's own text/attributes changing. For items written
    // as static, inline HTML, the browser's parser can insert the last item before appending
    // its text-node child; without watching `characterData`, that would permanently cache an
    // empty label, since nothing else re-triggers once the element itself stops changing.
    const slottedItems = signal<CommandPaletteItem[]>([]);

    const reparseSlottedItems = (): void => {
      slottedItems.value = parseSlottedItems([...el.children]);
    };

    reparseSlottedItems();

    const lightDomObserver = new MutationObserver(reparseSlottedItems);

    lightDomObserver.observe(el, { characterData: true, childList: true, subtree: true });
    onCleanup(() => lightDomObserver.disconnect());

    const allItems = computed<CommandPaletteItem[]>(() => {
      const explicit = props.items.value;

      return Array.isArray(explicit) ? explicit.map(normalizeItem) : slottedItems.value;
    });

    // ── Drill-down view ──
    // Categories nest one level, so the "stack" is a single value, held by `value`
    // rather than object identity: an `items` rewrite or a light-DOM reparse replaces
    // every item object, and a vanished category falls back to the root view instead
    // of stranding the palette on a stale row set.
    const activeCategoryValue = signal<string | null>(null);
    const activeCategory = computed(() => {
      const value = activeCategoryValue.value;

      if (value === null) return null;

      return allItems.value.find((item) => item.value === value && isCategory(item)) ?? null;
    });

    // Search is always global from the root: a typed query flattens category leaves
    // into one result list (searchItems), so no command hides behind a menu level.
    // The unqueried root shows category rows; inside a category, the query narrows
    // that category's own children. `no-filter` disables search, not browsing.
    const filteredItems = computed(() => {
      const category = activeCategory.value;

      if (category) return filterItems(category.children, appliedQuery.value, Boolean(props['no-filter'].value));

      if (props['no-filter'].value || !appliedQuery.value.trim()) return allItems.value;

      return searchItems(allItems.value, appliedQuery.value);
    });
    const groups = computed(() => buildGroups(filteredItems.value));

    // ── Result reflow motion ──
    // Filtering rewrites the list under the caret, and an instant swap makes the
    // focused command jump out of context. Rows are tracked by the item's
    // `value`, not by node identity: ore reuses row nodes positionally, so the
    // element carrying a key after a keystroke is often a different node than
    // the one that carried it before — necromancer's key matching animates the
    // value from its old slot to its new one either way. No stagger: rows
    // arrive and leave every keystroke, a cascade would read as lag.
    const resultMotion = animateReflow(el, abortSignal, {
      elements: () => [...(el.shadowRoot?.querySelectorAll<HTMLElement>('.item[data-value]') ?? [])],
      getKey: (item) => item.dataset.value || undefined,
    });

    // ── Keyboard navigation over the filtered list (Up/Down/Home/End) ──
    const scrollFocusedIntoView = (): void => {
      listboxEl?.querySelector<HTMLElement>('[data-focused]')?.scrollIntoView({ block: 'nearest' });
    };

    const list = createListControl<CommandPaletteItem>({
      getItems: () => filteredItems.value,
      isItemDisabled: (item) => item.disabled,
      onNavigate: scrollFocusedIntoView,
      signal: abortSignal,
    });
    const { focusedIndex } = list;

    // ── Active row: mirrors the focused row to the host so a `preview` slot can ──
    // follow keyboard, hover and typing without the host reaching into the listbox.
    // Watching the derived item (not just the index) also catches the row under a
    // stable index changing because the filtered list itself changed.
    watch(
      () => filteredItems.value[focusedIndex.value],
      (item) => {
        emit('active-change', item ? { item, label: item.label, value: item.value } : { label: '', value: '' });
      },
    );

    // The preview pane folds away while its slot is empty, so a palette that never
    // uses it keeps the plain single-column layout.
    const hasPreview = signal(false);

    // ── Debounced query application ──
    // `search-debounce` trades instant filtering for a settled result set: typed text
    // waits this many milliseconds before it reaches the list, the announce region and
    // the `search` event, so a fast typist reflows the list once instead of on every
    // keystroke (and a `no-filter` consumer rebuilds its catalogue once). The timer is
    // owned here rather than wrapped in a helper because the transitions that must land
    // at once — drill-in, back, close — cancel a pending apply.
    //
    // The visible list stays the contract for every "choose" action: `Enter` and a click
    // act on the row on screen even while a newer query is still waiting, exactly as they
    // would with instant filtering, so a keystroke can never select an unseen row.
    let appliedTimer: ReturnType<typeof setTimeout> | undefined;

    const cancelAppliedQuery = (): void => {
      if (appliedTimer === undefined) return;

      clearTimeout(appliedTimer);
      appliedTimer = undefined;
    };

    onCleanup(cancelAppliedQuery);

    /** Publishes the typed query to the list and the host: the one place typing reflows the list. */
    function applyQuery(): void {
      cancelAppliedQuery();

      const value = query.value;

      resultMotion.run(() => {
        appliedQuery.value = value;
        list.navigate('first');
      });
      emit('search', { query: value });

      const count = filteredItems.value.length;

      announce(count === 0 ? props['empty-text'].value! : `${count} result${count === 1 ? '' : 's'} found`, {
        document: el.ownerDocument,
      });
    }

    /** Routes a freshly typed query straight to `applyQuery`, or holds it for the debounce window. */
    function publishQuery(): void {
      cancelAppliedQuery();

      const delay = Math.max(0, props['search-debounce'].value ?? 0);

      if (delay === 0) {
        applyQuery();

        return;
      }

      appliedTimer = setTimeout(() => {
        appliedTimer = undefined;
        applyQuery();
      }, delay);
    }

    // ── Dialog chrome: native <dialog>, focus trap, Escape, backdrop click ──
    const resetSearch = (): void => {
      cancelAppliedQuery();
      resultMotion.run(() => {
        activeCategoryValue.value = null;
        query.value = '';
        appliedQuery.value = '';
        list.reset();
      });
    };

    const { closeWithAnimation, handleBackdropClick, overlay, requestClose, mount } = useDialogControl({
      defaultOpen: props['default-open'],
      dialogRef,
      getPanelEl: () => dialogRef.value?.querySelector<HTMLElement>('.panel'),
      host: el,
      initialFocus: computed(() => '.search-input'),
      isPersistent: () => false,
      onCleanup,
      onEscape: () => popCategory(),
      onEvent,
      onNativeClose: (reason) => {
        emit('open-change', { open: false, reason });
        resetSearch();
      },
      onOpen: (reason) => {
        emit('open-change', { open: true, reason });
        list.navigate('first');
      },
      openProp: props.open,
      performClose: () => closeWithAnimation(),
      returnFocus: computed(() => true),
    });

    // ── Global keyboard shortcut (opens/closes the palette from anywhere) ──
    const globalKeymap = createKeymap();

    globalKeymap.mount(window);
    onCleanup(() => globalKeymap.dispose());

    let unbindShortcut: (() => void) | null = null;

    watch(
      props.shortcut,
      (shortcutStr) => {
        unbindShortcut?.();
        unbindShortcut = null;

        const trimmed = (shortcutStr ?? '').trim();

        if (!trimmed) return;

        try {
          unbindShortcut = globalKeymap.bind({
            handler: () => {
              overlay.toggle('keyboard', 'trigger');
            },
            id: 'command-palette-toggle',
            shortcut: trimmed,
          });
        } catch (error) {
          warn(`invalid "shortcut" value "${trimmed}": ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      { immediate: true },
    );

    onMounted(() => {
      mount();
      if (dialogRef.value) onEvent(dialogRef.value, 'click', handleBackdropClick);
    });

    // ── Selection ────────────────────────────────────────────────────────────
    function selectItem(item: CommandPaletteItem): void {
      if (item.disabled) return;

      emit('select', { item, label: item.label, value: item.value });

      if (props['keep-open-on-select'].value) {
        searchInputRef.value?.focus();
      } else {
        requestClose('trigger');
      }
    }

    // ── Drill-down navigation ──
    // Entering a category is navigation, never `select`: a consumer's command handler
    // must never see a category value.
    //
    // Both transitions clear the query, and a cleared query is a search transition
    // like typing: `no-filter` consumers mirror the search text to build their own
    // catalogue, so without the re-emit they would keep supplying rows filtered
    // against the old text, and a category whose leaves those rows dropped would
    // vanish the moment it opened. The event fires only when text was actually
    // cleared, so a plain push/pop stays quiet.
    function pushCategory(item: CommandPaletteItem): void {
      if (!isCategory(item) || item.disabled) return;

      const clearedQuery = Boolean(query.value);
      cancelAppliedQuery();
      resultMotion.run(() => {
        activeCategoryValue.value = item.value;
        query.value = '';
        appliedQuery.value = '';
        list.navigate('first');
      });
      if (clearedQuery) emit('search', { query: '' });
      emit('category-open', { count: item.children.length, label: item.label, value: item.value });
      announce(`${item.label}: ${item.children.length} ${item.children.length === 1 ? 'command' : 'commands'}`, {
        document: el.ownerDocument,
      });
    }

    /** Returns to the root view, or `false` when already there (so Escape can close). */
    function popCategory(): boolean {
      if (activeCategory.value === null) return false;

      const clearedQuery = Boolean(query.value);
      cancelAppliedQuery();
      resultMotion.run(() => {
        activeCategoryValue.value = null;
        query.value = '';
        appliedQuery.value = '';
        list.navigate('first');
      });
      if (clearedQuery) emit('search', { query: '' });
      // The back row is a real button, so a pointer click leaves focus on it: it unmounts
      // with the category view, and focus would fall to <body> outside the trap.
      searchInputRef.value?.focus();
      announce(`${props['back-text'].value}: ${filteredItems.value.length} shown`, { document: el.ownerDocument });

      return true;
    }

    function handleInput(e: Event): void {
      // Only the typed signal moves here: the list, the announce and `search` follow
      // through `publishQuery`, which may hold them for the debounce window.
      query.value = (e.target as HTMLInputElement).value;
      publishQuery();
    }

    function handleKeydown(e: KeyboardEvent): void {
      const active = list.getActiveItem();

      // `ArrowRight` opens the focused category. The list control is configured
      // vertical-only, so it never claims the horizontal arrows and this handler sees them.
      if (e.key === 'ArrowRight' && active && isCategory(active)) {
        e.preventDefault();
        pushCategory(active);

        return;
      }

      // `ArrowLeft` pops, but only with an empty query: with text in the input the key
      // belongs to caret movement, and stealing it would make the query uneditable.
      if (e.key === 'ArrowLeft' && activeCategory.value !== null && !query.value) {
        e.preventDefault();
        popCategory();

        return;
      }

      // Same file-manager convention as `ArrowLeft`: backspace on an empty query steps out.
      if (e.key === 'Backspace' && activeCategory.value !== null && !query.value) {
        e.preventDefault();
        popCategory();

        return;
      }

      if (list.handleKeydown(e)) return;

      if (e.key === 'Enter') {
        // `Enter` commits what the player typed, so a query still inside the debounce
        // window is applied first: choosing the best match for the text in the input
        // beats choosing the best match for the text that happened to settle last.
        // A click keeps the opposite contract (the row under the pointer is the row
        // that was seen), which is why the flush lives here and not in `selectItem`.
        if (appliedTimer !== undefined) applyQuery();

        // `list.navigate('first')` (called on open and on every keystroke) already keeps
        // the focused row off a disabled item, so this fallback is only ever reached when
        // nothing has been focused yet, but it mirrors `selectItem`'s own disabled guard
        // rather than blindly grabbing index 0, in case that navigate-on-open wiring ever
        // changes.
        const entered = list.getActiveItem() ?? filteredItems.value.find((item) => !item.disabled);

        if (entered) {
          e.preventDefault();

          if (isCategory(entered)) pushCategory(entered);
          else selectItem(entered);
        }
      }
    }

    return html`
      <dialog ref="${dialogRef}" class="dialog" part="dialog" aria-label="${props.label}" aria-modal="true">
        <div class="panel" part="panel">
          <div class="search" part="search">
            <span class="search-icon" aria-hidden="true"><ore-icon name="search" size="18"></ore-icon></span>
            <input
              ref="${searchInputRef}"
              class="search-input"
              part="input"
              type="text"
              role="combobox"
              autocomplete="off"
              spellcheck="false"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls="${listboxId}"
              aria-activedescendant="${() => (focusedIndex.value >= 0 ? `${listboxId}-opt-${focusedIndex.value}` : '')}"
              placeholder="${props.placeholder}"
              value="${query}"
              @input="${handleInput}"
              @keydown="${handleKeydown}" />
            <span class="search-loader" ?hidden="${() => !props.loading.value}" aria-hidden="true"></span>
          </div>
          ${() =>
            activeCategory.value
              ? html`
                  <button type="button" class="back-row" @click="${popCategory}">
                    <span class="item-icon" aria-hidden="true"><ore-icon name="arrow-left" size="16"></ore-icon></span>
                    ${props['back-text'].value}
                  </button>
                `
              : ''}
          <div class="body">
          <div
            class="listbox"
            part="listbox"
            role="listbox"
            id="${listboxId}"
            aria-label="${() => (activeCategory.value ? `${activeCategory.value.label} commands` : 'Commands')}"
            ref="${(listEl: HTMLElement) => {
              listboxEl = listEl;
            }}">
            <div class="empty" role="presentation" ?hidden="${() => props.loading.value || groups.value.length > 0}">
              ${() => props['empty-text'].value}
            </div>
            ${() =>
              groups.value.flatMap((cluster, clusterIdx) => {
                const headingId = `${listboxId}-group-${clusterIdx}`;

                const rows = cluster.rows.map((row) => {
                  return html`
                    <div
                      class="item"
                      part="item"
                      role="option"
                      data-value="${row.item.value}"
                      id="${`${listboxId}-opt-${row.idx}`}"
                      aria-selected="${() => String(focusedIndex.value === row.idx)}"
                      aria-disabled="${() => String(row.item.disabled)}"
                      ?data-focused="${() => focusedIndex.value === row.idx}"
                      ?data-disabled="${() => row.item.disabled}"
                      ?data-category="${isCategory(row.item)}"
                      @click="${(e: MouseEvent) => {
                        e.stopPropagation();

                        if (isCategory(row.item)) pushCategory(row.item);
                        else selectItem(row.item);
                      }}"
                      @pointerenter="${() => {
                        list.set(row.idx);
                      }}">
                      ${
                        row.item.icon
                          ? html`
                              <span class="item-icon" aria-hidden="true">
                                <ore-icon name="${row.item.icon}" size="16"></ore-icon>
                              </span>
                            `
                          : ''
                      }
                      <span class="item-label">${row.item.label}</span>
                      ${
                        isCategory(row.item)
                          ? html`
                              <span class="item-count">${row.item.children.length}</span>
                              <span class="item-chevron" aria-hidden="true">
                                <ore-icon name="chevron-right" size="14"></ore-icon>
                              </span>
                            `
                          : ''
                      }
                      ${
                        row.item.shortcut
                          ? html`
                              <span class="item-shortcut">
                                ${splitShortcutKeys(row.item.shortcut).map(
                                  (key) => html`
                                    <ore-keyboard-key>${key}</ore-keyboard-key>
                                  `,
                                )}
                              </span>
                            `
                          : ''
                      }
                    </div>
                  `;
                });

                // Ungrouped items render bare: a `role="group"` wrapper with no
                // accessible name would only add nesting to the listbox.
                if (cluster.group === undefined) return rows;

                return html`
                  <div class="group" role="group" aria-labelledby="${headingId}">
                    <div class="group-heading" id="${headingId}" role="presentation">${cluster.group}</div>
                    ${rows}
                  </div>
                `;
              })}
          </div>
          <div class="preview" part="preview" role="region" aria-label="Preview" ?hidden="${() => !hasPreview.value}">
            <slot
              name="preview"
              @slotchange="${(e: Event) => {
                hasPreview.value = (e.target as HTMLSlotElement).assignedElements().length > 0;
              }}"
            ></slot>
          </div>
          </div>
          <div class="footer" part="footer">
            <span class="footer-hint">
              <ore-keyboard-key>↑</ore-keyboard-key>
              <ore-keyboard-key>↓</ore-keyboard-key>
              Navigate
            </span>
            <span class="footer-hint">
              <ore-keyboard-key>Enter</ore-keyboard-key>
              Select
            </span>
            <span class="footer-hint">
              <ore-keyboard-key>Esc</ore-keyboard-key>
              ${() => (activeCategory.value ? 'Back' : 'Close')}
            </span>
          </div>
        </div>
      </dialog>
    `;
  },
  styles: [componentStyles],
});
