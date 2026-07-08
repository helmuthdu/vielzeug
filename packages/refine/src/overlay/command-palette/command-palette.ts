import { createKeymap } from '@vielzeug/keymap';
import { define, html, ref, prop, getHost, onCleanup, onEvent, onMounted, useEmit, useSlots } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';

import type { CommandPaletteItem, OreCommandPaletteEvents, OreCommandPaletteProps } from './command-palette.types';

import { warn } from '../../_dev';
import { announce, lifecycleSignal, createListControl } from '../../headless';
import { reducedMotionMixin } from '../../styles';
import { useDialogControl } from '../shared/use-dialog';
import { buildRows, filterItems, normalizeItem, parseSlottedItems, splitShortcutKeys } from './command-palette-items';
import '../../content/icon/icon';
import componentStyles from './command-palette.css?inline';

export type { OreCommandPaletteEvents, OreCommandPaletteProps } from './command-palette.types';

/**
 * A pure data node describing one command. Never rendered directly — `ore-command-palette`
 * reads its attributes/text content and renders the visible row itself.
 *
 * @element ore-command-palette-item
 *
 * @attr {string} value - Value emitted by the `select` event and matched against the search query
 * @attr {string} label - Explicit label text; falls back to the element's text content
 * @attr {string} group - Group heading the item is clustered under
 * @attr {string} shortcut - Display-only keyboard hint rendered at the end of the row, one `<kbd>` per key (e.g. `"⌘+S"` renders two keycaps)
 * @attr {boolean} disabled - Excludes the item from keyboard navigation and selection
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
 * A searchable, keyboard-driven list of commands presented in a centered modal —
 * the "⌘K" pattern popularized by editors and productivity apps. Built on the
 * native `<dialog>` element (focus trap, top-layer stacking, `Escape`-to-close)
 * and `@vielzeug/keymap` for the global shortcut that opens it.
 *
 * @element ore-command-palette
 * @element ore-command-palette-item - Slotted command definition (place in default slot)
 *
 * @attr {boolean} open - Controls the open state of the palette
 * @attr {string} label - Accessible label for the dialog (screen-reader-only heading)
 * @attr {string} placeholder - Placeholder text for the search input
 * @attr {string} shortcut - Global keyboard shortcut (keymap syntax) that toggles the palette. Default `"mod+k"`; set to `""` to disable
 * @attr {boolean} no-filter - Disable built-in client-side filtering (for server-driven search)
 * @attr {boolean} loading - Shows a loading row below the search input
 * @attr {string} empty-text - Message shown when no item matches the query
 * @attr {boolean} keep-open-on-select - Keep the palette open after an item is selected
 *
 * @fires open - Fired when the palette opens. detail: `{ reason }`
 * @fires close - Fired when the palette closes. detail: `{ reason }`
 * @fires search - Fired on every keystroke in the search input. detail: `{ query }`
 * @fires select - Fired when a command is chosen (click or `Enter`). detail: `{ value, label, item }`
 *
 * @slot - `<ore-command-palette-item>` elements (alternative/supplement to the `items` prop)
 *
 * @cssprop --command-palette-bg - Panel background color
 * @cssprop --command-palette-border-color - Panel border color
 * @cssprop --command-palette-radius - Panel border radius
 * @cssprop --command-palette-shadow - Panel drop shadow
 * @cssprop --command-palette-max-width - Maximum panel width
 * @cssprop --command-palette-backdrop - Backdrop overlay color
 * @cssprop --command-palette-option-hover-bg - Item background on hover
 * @cssprop --command-palette-option-focus-bg - Item background when keyboard-focused
 *
 * @part dialog - Dialog root container
 * @part panel - Panel container
 * @part input - Search input
 * @part listbox - Listbox of matching commands
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
define<OreCommandPaletteProps>(COMMAND_PALETTE_TAG, {
  props: {
    'empty-text': prop.string('No results found.'),
    items: prop.data<OreCommandPaletteProps['items']>(),
    'keep-open-on-select': prop.bool(false),
    label: prop.string('Command palette'),
    loading: prop.bool(false),
    'no-filter': prop.bool(false),
    open: prop.bool(false),
    placeholder: prop.string('Type a command or search…'),
    shortcut: prop.string('mod+k'),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreCommandPaletteEvents>();
    const slots = useSlots();
    const abortSignal = lifecycleSignal(onCleanup);

    const dialogRef = ref<HTMLDialogElement>();
    const searchInputRef = ref<HTMLInputElement>();
    const listboxId = 'cmdk-listbox';

    let listboxEl: HTMLElement | null = null;

    const query = signal('');

    // ── Items: slotted <ore-command-palette-item> elements, merged with the `items` prop ──
    const slottedItems = signal<CommandPaletteItem[]>([]);

    const reparseSlottedItems = (): void => {
      slottedItems.value = parseSlottedItems(slots.elements().value);
    };

    watch(slots.elements(), reparseSlottedItems, { immediate: true });

    // `slotchange` fires only when the *set* of assigned elements changes, not when an
    // already-assigned element's own content changes. For items written as static, inline
    // HTML, the browser's parser can assign the last item to its slot before appending that
    // item's text-node child — permanently caching an empty label, since no later
    // `slotchange` ever fires to correct it. A light-DOM MutationObserver catches that
    // follow-up text insertion and re-parses.
    const lightDomObserver = new MutationObserver(reparseSlottedItems);

    lightDomObserver.observe(el, { characterData: true, childList: true, subtree: true });
    onCleanup(() => lightDomObserver.disconnect());

    const allItems = computed<CommandPaletteItem[]>(() => {
      const explicit = props.items.value;

      return Array.isArray(explicit) ? explicit.map(normalizeItem) : slottedItems.value;
    });

    const filteredItems = computed(() => filterItems(allItems.value, query.value, Boolean(props['no-filter'].value)));
    const rows = computed(() => buildRows(filteredItems.value));

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

    // ── Dialog chrome: native <dialog>, focus trap, Escape, backdrop click ──
    const resetSearch = (): void => {
      query.value = '';
      list.reset();
    };

    const { closeWithAnimation, overlay, requestClose, setupNativeListeners } = useDialogControl({
      dialogRef,
      getPanelEl: () => dialogRef.value?.querySelector<HTMLElement>('.panel'),
      host: el,
      initialFocus: computed(() => '.search-input'),
      isPersistent: () => false,
      onCleanup,
      onEvent,
      onNativeClose: (reason) => {
        emit('close', { reason });
        resetSearch();
      },
      onOpen: (reason) => {
        emit('open', { reason });
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
          unbindShortcut = globalKeymap.bind(trimmed, () => {
            overlay.toggle('keyboard', 'trigger');
          });
        } catch (error) {
          warn(`invalid "shortcut" value "${trimmed}" — ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      { immediate: true },
    );

    onMounted(() => {
      setupNativeListeners();
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

    function handleInput(e: Event): void {
      const value = (e.target as HTMLInputElement).value;

      query.value = value;
      list.navigate('first');
      emit('search', { query: value });

      const count = filteredItems.value.length;

      announce(count === 0 ? props['empty-text'].value! : `${count} result${count === 1 ? '' : 's'} found`);
    }

    function handleKeydown(e: KeyboardEvent): void {
      if (list.handleKeydown(e)) return;

      if (e.key === 'Enter') {
        const active = list.getActiveItem() ?? filteredItems.value[0];

        if (active) {
          e.preventDefault();
          selectItem(active);
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
          <div
            class="listbox"
            part="listbox"
            role="listbox"
            id="${listboxId}"
            aria-label="Commands"
            ref="${(listEl: HTMLElement) => {
              listboxEl = listEl;
            }}">
            <div class="empty" role="presentation" ?hidden="${() => props.loading.value || rows.value.length > 0}">
              ${() => props['empty-text'].value}
            </div>
            ${() =>
              rows.value.map((row) =>
                row.type === 'group'
                  ? html`<div class="group-heading" role="presentation">${row.group}</div>`
                  : html`<div
                      class="item"
                      part="item"
                      role="option"
                      id="${`${listboxId}-opt-${row.idx}`}"
                      aria-selected="${() => String(focusedIndex.value === row.idx)}"
                      aria-disabled="${() => String(row.item.disabled)}"
                      ?data-focused="${() => focusedIndex.value === row.idx}"
                      ?data-disabled="${() => row.item.disabled}"
                      @click="${(e: MouseEvent) => {
                        e.stopPropagation();
                        selectItem(row.item);
                      }}"
                      @pointerenter="${() => {
                        list.set(row.idx);
                      }}">
                      ${
                        row.item.icon
                          ? html`<span class="item-icon" aria-hidden="true"
                              ><ore-icon name="${row.item.icon}" size="16"></ore-icon
                            ></span>`
                          : ''
                      }
                      <span class="item-label">${row.item.label}</span>
                      ${
                        row.item.shortcut
                          ? html`<span class="item-shortcut"
                              >${splitShortcutKeys(row.item.shortcut).map((key) => html`<kbd>${key}</kbd>`)}</span
                            >`
                          : ''
                      }
                    </div>`,
              )}
          </div>
          <div class="footer" part="footer">
            <span class="footer-hint"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span class="footer-hint"><kbd>Enter</kbd> Select</span>
            <span class="footer-hint"><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </dialog>
      <slot style="display:none"></slot>
    `;
  },
  styles: [reducedMotionMixin, componentStyles],
});
