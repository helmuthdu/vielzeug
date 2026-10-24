import {
  bind,
  createId,
  define,
  getHost,
  html,
  onCleanup,
  onElement,
  onMounted,
  prop,
  ref,
  useEmit,
  watchEffect,
} from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import {
  type ChoiceChangeDetail,
  createListboxDropdown,
  lifecycleSignal,
  type OverlayCloseDetail,
  type OverlayOpenChangeDetail,
  setAriaReflection,
} from '../../core';
import { colorThemeMixin, roundedVariantMixin, srOnlyMixin } from '../../styles';
import { type AddEventListeners, COMPONENT_SIZES, ROUNDED_SIZES } from '../../types';
import { dispatchNativeFieldEvent } from '../shared/native-field-event';
import componentStyles from './query-bar.css?inline';
import type { OreQueryBarEvents, OreQueryBarProps, QueryBarLabels, QueryQuickFilter } from './query-bar.types';
import {
  clearTokens,
  commitToken,
  parseQuery,
  type QueryState,
  type QuerySuggestion,
  type QueryToken,
  type QueryTokenDef,
  removeToken,
  suggestQuery,
} from './query-bar-grammar';

export { ICON_TAG } from '../../content/icon/icon';
export { CHIP_TAG } from '../../feedback/chip/chip';
export { DRAWER_TAG } from '../../overlay/drawer/drawer';
export { BUTTON_TAG } from '../button/button';
export { CHECKBOX_TAG } from '../checkbox/checkbox';
export { INPUT_TAG } from '../input/input';
export { RADIO_TAG } from '../radio/radio';
export { RADIO_GROUP_TAG } from '../radio-group/radio-group';
export type { OreQueryBarEvents, OreQueryBarProps, QueryBarLabels, QueryQuickFilter } from './query-bar.types';
export * from './query-bar-grammar';

const QUERY_BAR_VARIANTS = ['flat', 'solid', 'bordered', 'outline', 'ghost'] as const;
const LABELS: QueryBarLabels = {
  any: 'Any',
  applied: 'Applied filters',
  apply: 'Apply filters',
  cancel: 'Cancel',
  clear: 'Clear search text',
  clearFilter: 'Clear {filter}',
  filters: 'Filters',
  hiddenSelected: '{count} selected hidden by search',
  noMatch: 'No matching options — searching as text',
  noOptions: 'No matching options.',
  pending: 'Changes not applied',
  quickFilters: 'Quick filters',
  reset: 'Reset filters',
  searchOptions: 'Find {filter}',
  selected: '{count} selected',
  selectedValues: 'Selected: {values}',
  showAll: 'Show all options',
};

const equalState = (left: QueryState, right: QueryState): boolean =>
  left.text === right.text &&
  left.tokens.length === right.tokens.length &&
  left.tokens.every(
    (token, index) => token.key === right.tokens[index]?.key && token.value === right.tokens[index]?.value,
  );

/**
 * A search field that accepts free text and `key:value` tokens together, in the
 * grammar GitHub's pull-request search made familiar. Applied filters stay inside
 * the field. A drawer edits filters without typing; curated quick filters toggle
 * immediately. Each vocabulary key chooses single or multiple selection; repeated
 * keys accumulate distinct values only in multiple mode. Typed suggestions and
 * the drawer share one vocabulary and state.
 *
 * The bar is state-driven: `vocabulary` defines the token keys and their accepted
 * values, `state` carries `{ text, tokens }`, and every edit emits `input` +
 * `change` with the new state readable from the element's `state` property. Omit
 * `state` for uncontrolled use. Equivalent external states preserve live drafts;
 * actual external changes replace both text and tokens and dismiss pending edits.
 *
 * The dropdown opens while the field holds focus (and reopens on typing after
 * Escape) and overlays the page from the top layer. Picking a key suggestion
 * starts composing `key:`; picking a value commits its pill. Typing a complete
 * `key:value` commits immediately. Backspace on an empty field removes the last
 * pill. A draft whose value matches nothing shows a "searching as text" row
 * instead of closing; on blur, a bare `key:` fragment reverts and a dead draft
 * degrades into the searched text, so the field never carries silent residue.
 *
 * @element ore-query-bar
 *
 * @attr {string} label - Accessible name for the entry field
 * @attr {string} placeholder - Field placeholder, typically the surface's search hint
 * @attr {string} error - Inline error under the field
 * @attr {string} helper - Helper text under the field
 * @attr {boolean} hide-label - Hide the visible label while keeping its accessible name
 * @attr {boolean} clearable - Show a clear (×) button; it clears the free text only
 * @attr {boolean} disabled - Disable the whole bar
 * @attr {string} size - Field size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Field radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} variant - Field variant: 'flat' | 'solid' | 'bordered' | 'outline' | 'ghost'
 *
 * @prop {QueryState} state - The controlled query state; write a new object to apply external changes
 * @prop {QueryTokenDef[]} vocabulary - The token vocabulary
 * @prop {QueryQuickFilter[]} quick-filters - Application-curated single-filter toggles
 * @prop {Partial<QueryBarLabels>} labels - Localized built-in copy
 *
 * @fires input - The query changed; read the new state from the `state` property
 * @fires change - Same as `input`
 * @fires open-change - A surface opened or closed. detail: { open, reason, surface: 'suggestions' | 'filters' }
 *
 * @slot toolbar-end - Application content at the end of the toolbar row, e.g. a result count
 *
 * @part wrapper - The ore-input field host
 * @part dropdown - The suggestion dropdown container
 * @part toolbar - Filter button, quick filters, and the toolbar-end slot
 * @part toolbar-end - End-aligned container for the toolbar-end slot content
 * @part applied - Removable applied filters inside the field
 * @cssprop --query-bar-min-width - Minimum host width (default 0)
 * @cssprop --query-bar-option-height - Minimum suggestion row height (default var(--size-11))
 * @cssprop --query-bar-dropdown-min-width - Dropdown panel minimum width (default 16rem)
 * @cssprop --query-bar-dropdown-max-width - Dropdown panel maximum width (default 28rem, viewport-capped)
 * @cssprop --chip-* - Pill styling (see ore-chip)
 * @cssprop --combobox-dropdown-* - Dropdown panel and option styling (see ore-combobox)
 *
 * @example
 * ```html
 * <ore-query-bar id="bar" label="Search issues" placeholder="Title, author or label…" clearable>
 * </ore-query-bar>
 * <script>
 *   bar.vocabulary = [
 *     { key: 'author', label: 'Author', options: [{ label: 'Alice', value: 'alice' }] },
 *   ];
 * </script>
 * ```
 */
export const QUERY_BAR_TAG = 'ore-query-bar' as const;
define<OreQueryBarProps>(QUERY_BAR_TAG, {
  props: {
    clearable: prop.bool(false),
    disabled: prop.bool(false),
    error: prop.string(),
    helper: prop.string(),
    'hide-label': prop.bool(false),
    label: prop.string(),
    labels: prop.data<Partial<QueryBarLabels>>(),
    placeholder: prop.string(),
    'quick-filters': prop.data<QueryQuickFilter[]>(),
    rounded: prop.oneOf(ROUNDED_SIZES),
    size: prop.oneOf(COMPONENT_SIZES),
    state: prop.data<QueryState>(),
    variant: prop.oneOf(QUERY_BAR_VARIANTS),
    vocabulary: prop.data<QueryTokenDef[]>(),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreQueryBarEvents>();
    const watch = watchEffect;
    const abortSignal = lifecycleSignal(onCleanup);
    const barId = createId('query-bar');

    const vocabulary = (): QueryTokenDef[] => props.vocabulary.value ?? [];
    const emptyState = (): QueryState => ({ text: '', tokens: [] });
    const normalizeState = (value: unknown): QueryState | null => {
      if (value == null) return emptyState();
      if (typeof value !== 'object' || !Array.isArray((value as QueryState).tokens)) return null;
      const state = value as QueryState;
      return { text: typeof state.text === 'string' ? state.text : '', tokens: state.tokens };
    };

    /**
     * The working state: the initial `state` prop plus every commit this bar emits
     * before the consumer round-trips it. Gestures must read from here, never from
     * the prop directly: props lag a render behind, so two quick pill removals
     * would otherwise each compute from the same stale snapshot and the second
     * would resurrect the first pill.
     */
    const working = signal<QueryState>(normalizeState(props.state.value) ?? emptyState());
    /** What the field shows: the live draft (free text plus an unfinished token). */
    const field = signal(working.value.text);

    const suggestions = computed<QuerySuggestion[]>(() => suggestQuery(field.value, vocabulary()));
    const defBy = computed(() => new Map(vocabulary().map((def) => [def.key, def])));

    /**
     * True while the draft names a known key whose prefix matches no option. The
     * dropdown then shows a "searching as text" row instead of closing, so the
     * degradation is never silent — and blur makes the state honest (below).
     */
    const noMatch = computed(() => {
      const draft = parseQuery(field.value, vocabulary()).draft;
      return draft !== null && draft.valuePrefix !== '' && suggestions.value.length === 0;
    });

    // Element refs the listbox dropdown needs; resolved as the template renders.
    let inputEl: HTMLInputElement | null = null;
    let dropdownEl: HTMLElement | null = null;
    const inputRef = ref<HTMLElement>();
    const filterButton = ref<HTMLElement>();
    const drawerHeading = ref<HTMLElement>();
    const drawerOpen = signal(false);
    const draft = signal<QueryToken[]>([]);
    const searches = signal<Record<string, string>>({});
    const drawerPlacement = signal<'bottom' | 'right'>('right');
    const hasToolbarEnd = signal(false);
    const label = (key: keyof QueryBarLabels): string => props.labels.value?.[key] ?? LABELS[key];
    const selected = (tokens: QueryToken[], token: QueryToken): boolean =>
      tokens.some((item) => item.key === token.key && item.value === token.value);
    const available = (token: QueryToken): boolean =>
      Boolean(defBy.value.get(token.key)?.options.some((option) => option.value === token.value));
    const activeCount = computed(() => new Set(working.value.tokens.map((token) => token.key)).size);
    const draftCount = (key: string): number => draft.value.filter((token) => token.key === key).length;
    const dirty = computed(() => !equalState({ text: working.value.text, tokens: draft.value }, working.value));
    const filteredOptions = (def: QueryTokenDef) => {
      const search = (searches.value[def.key] ?? '').trim().toLocaleLowerCase();
      return def.options
        .map((option, index) => ({ ...option, index }))
        .filter((option) => option.label.toLocaleLowerCase().includes(search));
    };
    const optionContent = (option: QueryTokenDef['options'][number]) => html`
      <span class="choice-label">
        ${
          option.icon
            ? html`
                <ore-icon name=${option.icon} aria-hidden="true"></ore-icon>
              `
            : ''
        }
        <span>${option.label}</span>
      </span>
    `;
    // A token whose every option carries an icon renders as a card gallery: the
    // choice control becomes the card (corner tick, centered art, name below).
    // All-or-nothing per token keeps a gallery never half art / half text, and
    // lazily loaded art flipping a token icon-complete upgrades it automatically.
    const usesCards = (def: QueryTokenDef): boolean =>
      def.options.length > 0 && def.options.every((option) => !!option.icon);
    const hiddenSelections = (def: QueryTokenDef) => {
      const visible = new Set(filteredOptions(def).map((option) => option.value));
      return def.options.filter(
        (option) => selected(draft.value, { key: def.key, value: option.value }) && !visible.has(option.value),
      );
    };

    function openFilters(): void {
      if (props.disabled.value || !vocabulary().length) return;
      optionList.close('programmatic');
      inputEl?.blur();
      // Native dialog focus must return to Filters, not the keyboard-opening search field.
      filterButton.value?.focus();
      draft.value = working.value.tokens.map((token) => ({ ...token }));
      searches.value = {};
      drawerPlacement.value = el.ownerDocument.defaultView!.matchMedia('(max-width: 40rem)').matches
        ? 'bottom'
        : 'right';
      drawerOpen.value = true;
    }

    function applyFilters(): void {
      if (props.disabled.value) return;
      const next = { text: working.value.text, tokens: draft.value };
      field.value = next.text;
      drawerOpen.value = false;
      if (!equalState(working.value, next)) commit(next);
    }

    function toggleQuickFilter(token: QueryQuickFilter): void {
      if (props.disabled.value || !available(token)) return;
      commit(
        selected(working.value.tokens, token)
          ? removeToken(working.value, token)
          : commitToken(working.value, token, defBy.value.get(token.key)?.selection),
      );
    }

    const optionList = createListboxDropdown<QuerySuggestion>({
      getBoundary: () => el,
      getFocusedOptionElement: () => dropdownEl?.querySelector<HTMLElement>('[data-focused]') ?? null,
      getItems: () => suggestions.value,
      getOptionId: (index) => `${barId}-opt-${index}`,
      getPanel: () => dropdownEl,
      getReference: () => el,
      getTrigger: () => inputEl,
      isDisabled: () => Boolean(props.disabled.value),
      isItemDisabled: () => false,
      onClose: (reason) => emit('open-change', { open: false, reason, surface: 'suggestions' }),
      onOpen: (reason) => emit('open-change', { open: true, reason, surface: 'suggestions' }),
      // Anchor below the complete bar so suggestions never cover filter controls.
      positioning: { matchWidth: false },
      restoreFocus: false,
      signal: abortSignal,
    });
    const { focusedIndex, isOpen } = optionList;

    bind({
      attr: {
        open: () => (isOpen.value ? true : undefined),
        size: props.size,
        variant: props.variant,
      },
    });

    // Equivalent consumer echoes must not erase an unfinished key:value draft.
    Object.defineProperty(el, 'state', {
      configurable: true,
      enumerable: true,
      get: () => working.value,
      set: (value: unknown) => {
        const next = normalizeState(value);
        if (next === null || equalState(next, working.value)) return;
        working.value = next;
        field.value = next.text;
        drawerOpen.value = false;
      },
    });

    // ── State commits ────────────────────────────────────────────────────────

    function emitChange(): void {
      dispatchNativeFieldEvent(el, 'input');
      dispatchNativeFieldEvent(el, 'change');
    }

    /** Applies the next state locally and announces it; the consumer reads `el.state`. */
    function commit(next: QueryState): void {
      if (equalState(working.value, next)) return;
      working.value = next;
      emitChange();
    }

    /** Folds parsed tokens into the working set, replacing per key and keeping slots. */
    function mergeTokens(base: QueryToken[], parsed: readonly QueryToken[]): QueryToken[] {
      let state: QueryState = { text: '', tokens: base };
      for (const token of parsed) {
        state = commitToken(state, token, defBy.value.get(token.key)?.selection);
      }
      return state.tokens;
    }

    /** Parses the field, folds any complete tokens into the working state, and commits. */
    function applyField(): void {
      const parsed = parseQuery(field.value, vocabulary());
      if (parsed.tokens.length > 0) field.value = parsed.text;
      commit({ text: parsed.text, tokens: mergeTokens(working.value.tokens, parsed.tokens) });
    }

    function handleInput(event: Event): void {
      field.value = (event.target as HTMLInputElement).value;
      applyField();
      // Typing is the strongest composing signal: the dropdown must come back after
      // Escape without a blur/refocus cycle, or the bar reads as broken.
      if (!drawerOpen.value && canOpen()) optionList.open('keyboard');
    }

    function pick(suggestion: QuerySuggestion): void {
      // The word being typed is selector intent: whichever suggestion is picked consumes
      // it, so it never leaks into the free text as a stray search term. A field ending
      // in whitespace has no active word; a `key:…` draft is consumed like any word.
      const rest =
        /\s$/.test(field.value) || field.value.trim() === '' ? '' : field.value.replace(/\S+\s*$/, '').trim();
      if (suggestion.kind === 'key') {
        // Start composing: replace the word being typed with the token key.
        field.value = rest ? `${rest} ${suggestion.key}:` : `${suggestion.key}:`;
        applyField();
      } else {
        field.value = rest;
        commit(
          commitToken(
            { text: rest, tokens: working.value.tokens },
            { key: suggestion.key, value: suggestion.value },
            defBy.value.get(suggestion.key)?.selection,
          ),
        );
      }
      inputEl?.focus();
    }

    function removeChip(event: Event, token: QueryToken): void {
      event.stopPropagation();
      if (props.disabled.value) return;
      commit(removeToken(working.value, token));
      filterButton.value?.focus();
    }

    /** The field's own clear button: clears the free text, never the pills. */
    function clearText(): void {
      if (props.disabled.value) return;
      field.value = '';
      commit({ text: '', tokens: working.value.tokens });
      inputEl?.focus();
    }

    function handleKeydown(e: KeyboardEvent): void {
      if (props.disabled.value) return;

      // While open, the listbox owns arrows, Home/End, and Escape.
      if (optionList.handleKeydown(e)) return;

      switch (e.key) {
        case 'Enter': {
          const active = isOpen.value ? suggestions.value[focusedIndex.value] : undefined;
          if (active) {
            e.preventDefault();
            pick(active);
          }
          break;
        }
        case 'Backspace':
          // The GitHub-style touch: backspace on an empty field drops the last pill.
          if (field.value === '' && working.value.tokens.length > 0) {
            const last = working.value.tokens[working.value.tokens.length - 1];
            if (last) commit(removeToken(working.value, last));
          }
          break;
        case 'Tab':
          optionList.close('programmatic');
          break;
        default:
          break;
      }
    }

    // The dropdown is open exactly while the field holds focus and has something to
    // show — suggestions, or the no-match row for an unresolvable draft; Escape,
    // outside pointers, and Tab dismiss it through the machinery.
    const canOpen = (): boolean => suggestions.value.length > 0 || noMatch.value;
    const openDropdown = (): void => {
      if (!drawerOpen.value && canOpen()) optionList.open('focus');
    };
    watch(() => {
      if (isOpen.value && !canOpen()) optionList.close('programmatic');
      if (props.disabled.value) {
        drawerOpen.value = false;
        optionList.close('programmatic');
      }
    });
    watch(() => {
      void props.vocabulary.value;
      drawerOpen.value = false;
    });

    /**
     * Blur makes the field honest about dead drafts. A bare `key:` fragment is dead
     * syntax — revert it, leaving no residue. A draft that matches nothing was
     * already announced as "searching as text" — degrade it into the text so what
     * the field shows is what is searched. Live compositions (a draft with matching
     * suggestions) survive blur, so an interrupted pick resumes on refocus.
     */
    function handleFocusOut(event: FocusEvent): void {
      const next = event.relatedTarget;
      if (next instanceof Node && el.shadowRoot?.contains(next)) return;

      const parsed = parseQuery(field.value, vocabulary());
      if (!parsed.draft) return;
      if (parsed.draft.valuePrefix === '') {
        field.value = parsed.text;
        return;
      }
      if (suggestQuery(field.value, vocabulary()).length === 0) {
        const degraded = parsed.text
          ? `${parsed.text} ${parsed.draft.key}:${parsed.draft.valuePrefix}`
          : `${parsed.draft.key}:${parsed.draft.valuePrefix}`;
        field.value = degraded;
        commit({ text: degraded, tokens: working.value.tokens });
      }
    }

    // New suggestions start from no highlight; arrows move it, Enter commits it.
    watch(() => {
      void suggestions.value;
      if (optionList.isOpen.value) optionList.set(-1);
    });

    // The dropdown is popover=manual: without showPopover the UA stylesheet keeps it
    // display:none, so the panel must enter the top layer exactly when it opens.
    watch(() => {
      if (isOpen.value) {
        if (dropdownEl && 'showPopover' in dropdownEl && !dropdownEl.matches(':popover-open')) {
          dropdownEl.showPopover();
        }
        optionList.updatePosition();
      } else if (dropdownEl && 'hidePopover' in dropdownEl && dropdownEl.matches(':popover-open')) {
        dropdownEl.hidePopover();
      }
    });

    // Once ore-input is in the DOM, grab its inner <input> from its shadow root and
    // attach the query-bar's ARIA and event handlers imperatively (the combobox
    // pattern: the focused element must carry the combobox semantics itself).
    onElement(inputRef, (bitInputEl) => {
      const rawInput = bitInputEl.shadowRoot?.querySelector<HTMLInputElement>('input') ?? null;
      if (!rawInput) return;

      inputEl = rawInput;

      rawInput.setAttribute('role', 'combobox');
      rawInput.setAttribute('autocomplete', 'off');
      rawInput.setAttribute('aria-autocomplete', 'list');
      rawInput.setAttribute('aria-haspopup', 'listbox');
      rawInput.setAttribute('spellcheck', 'false');
      // Backspace on the empty field drops the last pill: the only discoverability
      // of that shortcut for assistive tech.
      rawInput.setAttribute('aria-keyshortcuts', 'Backspace');

      rawInput.addEventListener('input', handleInput as EventListener);
      rawInput.addEventListener('keydown', handleKeydown as EventListener);
      rawInput.addEventListener('focus', openDropdown);
      rawInput.addEventListener('focusout', handleFocusOut as EventListener);

      return () => {
        inputEl = null;
        rawInput.removeEventListener('input', handleInput as EventListener);
        rawInput.removeEventListener('keydown', handleKeydown as EventListener);
        rawInput.removeEventListener('focus', openDropdown);
        rawInput.removeEventListener('focusout', handleFocusOut as EventListener);
      };
    });

    onMounted(() => {
      const listbox = el.shadowRoot?.querySelector<HTMLElement>('[role="listbox"]');
      if (inputEl) setAriaReflection(inputEl, 'ariaControlsElements', listbox ? [listbox] : []);
    });

    // Reactively sync combobox-specific ARIA the field does not manage itself.
    watch(() => {
      if (!inputRef.value || !inputEl) return;

      inputEl.setAttribute('aria-expanded', String(isOpen.value));

      const listbox = el.shadowRoot?.querySelector<HTMLElement>('[role="listbox"]');
      setAriaReflection(inputEl, 'ariaControlsElements', listbox ? [listbox] : []);
      const activeId = optionList.ariaActiveDescendant.value;
      const activeOption = activeId
        ? [...(dropdownEl?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])].find(
            (option) => option.id === activeId,
          )
        : null;
      setAriaReflection(inputEl, 'ariaActiveDescendantElement', activeOption?.id === activeId ? [activeOption] : []);

      if (props.disabled.value) inputEl.setAttribute('aria-disabled', 'true');
      else inputEl.removeAttribute('aria-disabled');

      if (props.error.value) inputEl.setAttribute('aria-invalid', 'true');
      else inputEl.removeAttribute('aria-invalid');
    });

    // Reactively sync the field signal into the raw input value.
    watch(() => {
      if (!inputRef.value || !inputEl) return;
      if (inputEl.value !== field.value) inputEl.value = field.value;
    });

    onCleanup(() => {
      optionList[Symbol.dispose]();
    });

    // When hide-label is set, suppress the visible label passed to ore-input (no inset
    // label renders, avoiding extra field height) but expose the label text as
    // aria-label on the input so the bar retains its accessible name.
    const hideLabel = () => props['hide-label'].value;
    const inputLabel = () => (hideLabel() ? '' : (props.label.value ?? ''));
    const inputAriaLabel = () => (hideLabel() ? (props.label.value ?? '') : null);

    /** Pill copy: `Author: Alice`, degrading to the raw key/value outside the vocabulary. */
    const pillLabel = (token: QueryToken): string => {
      const def = defBy.value.get(token.key);
      const option = def?.options.find((candidate) => candidate.value === token.value);
      if (def && option) return `${def.label}: ${option.label}`;
      return `${def?.key ?? token.key}: ${option?.label ?? token.value}`;
    };

    /** The muted second column: the token key for value rows, the `key:` syntax for key rows. */
    const optionMeta = (suggestion: QuerySuggestion): string => {
      const def = defBy.value.get(suggestion.key);
      return suggestion.kind === 'key' ? `${suggestion.key}:` : (def?.label ?? suggestion.key);
    };

    return html`
      <ore-input
        class="trigger"
        ref=${inputRef}
        label="${inputLabel}"
        aria-label="${inputAriaLabel}"
        placeholder="${() => props.placeholder.value ?? ''}"
        label-placement="inset"
        variant="${() => props.variant.value ?? 'bordered'}"
        size="${() => props.size.value ?? ''}"
        rounded="${() => props.rounded.value ?? 'md'}"
        helper="${() => props.helper.value ?? ''}"
        error="${() => props.error.value ?? ''}"
        ?disabled="${() => Boolean(props.disabled.value)}"
        @input=${(event: Event) => event.stopPropagation()}
        @change=${(event: Event) => event.stopPropagation()}
        part="wrapper">
        <div class="prefix" slot="prefix">
          <ore-icon name="search" size="16" aria-hidden="true"></ore-icon>
          <span class="applied" part="applied" role="group" aria-label=${() => label('applied')}>
            ${() =>
              working.value.tokens.map(
                (token) => html`
                  <ore-chip
                    label=${pillLabel(token)}
                    mode="removable"
                    variant="flat"
                    size="sm"
                    rounded="full"
                    ?disabled=${() => props.disabled.value}
                    @remove=${(event: Event) => removeChip(event, token)}>
                    ${pillLabel(token)}
                  </ore-chip>
                `,
              )}
          </span>
        </div>
        <span class="suffix" slot="suffix">
          <button
            class="clear-btn"
            part="clear-btn"
            type="button"
            aria-label=${() => label('clear')}
            ?disabled=${() => props.disabled.value}
            ?hidden="${() => !props.clearable.value || field.value === ''}"
            @click="${clearText}">
            <ore-icon name="x" size="12" stroke-width="2.5" aria-hidden="true"></ore-icon>
          </button>
        </span>
      </ore-input>
      <div
        class="toolbar"
        part="toolbar"
        ?hidden=${() => !vocabulary().length && !props['quick-filters'].value?.length && !hasToolbarEnd.value}>
        <ore-button
          class="filter-button"
          ref=${filterButton}
          variant="ghost"
          size="sm"
          rounded="full"
          aria-haspopup="dialog"
          aria-expanded=${drawerOpen}
          aria-label=${() => `${label('filters')}${activeCount.value ? ` (${activeCount.value})` : ''}`}
          ?disabled=${() => props.disabled.value || !vocabulary().length}
          ?hidden=${() => !vocabulary().length}
          @click=${openFilters}>
          <ore-icon slot="prefix" name="filter" aria-hidden="true"></ore-icon>
          ${() => label('filters')}
          <span slot="suffix" class="filter-count" ?hidden=${() => !activeCount.value}>${activeCount}</span>
        </ore-button>
        <div
          class="quick-filters"
          role="group"
          aria-label=${() => label('quickFilters')}
          ?hidden=${() => !props['quick-filters'].value?.length}>
          ${() =>
            (props['quick-filters'].value ?? []).map(
              (token) => html`
                <ore-chip
                  mode="selectable"
                  variant="ghost"
                  size="sm"
                  color="primary"
                  rounded="full"
                  checked=${() => selected(working.value.tokens, token)}
                  ?disabled=${() => props.disabled.value || !available(token)}
                  @change=${(event: Event) => {
                    event.stopPropagation();
                    toggleQuickFilter(token);
                  }}>
                  ${token.label}
                </ore-chip>
              `,
            )}
        </div>
        <div
          class="toolbar-end"
          part="toolbar-end"
          ?hidden=${() => !hasToolbarEnd.value}
          @slotchange=${(event: Event) => {
            // Pretty-printed markup assigns whitespace text nodes: only real
            // content counts, or the empty container would add a phantom gap.
            hasToolbarEnd.value = (event.target as HTMLSlotElement)
              .assignedNodes()
              .some((node) => node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()));
          }}>
          <slot name="toolbar-end"></slot>
        </div>
      </div>
      <ore-drawer
        class="filters-drawer"
        title=${() => label('filters')}
        placement=${drawerPlacement}
        drag-handle-placement="inset"
        ?open=${drawerOpen}
        @close-request=${(event: CustomEvent<OverlayCloseDetail>) => {
          event.stopPropagation();
          if (dirty.value && (event.detail.reason === 'outsideClick' || event.detail.reason === 'swipe')) {
            event.preventDefault();
          }
        }}
        @input=${(event: Event) => event.stopPropagation()}
        @change=${(event: Event) => event.stopPropagation()}
        @open-change=${(event: CustomEvent<OverlayOpenChangeDetail>) => {
          event.stopPropagation();
          drawerOpen.value = event.detail.open;
          if (event.detail.open) drawerHeading.value?.focus();
          emit('open-change', { ...event.detail, surface: 'filters' });
        }}>
        <div class="drawer-heading" ref=${drawerHeading} slot="header" tabindex="-1">${() => label('filters')}</div>
        <div class="filter-groups">
          ${() =>
            vocabulary().map(
              (def) => html`
                <section class="filter-group">
                  ${
                    def.selection === 'multiple'
                      ? html`
                          <div class="filter-group-heading">
                            <h3>${def.label}</h3>
                            <span class="filter-count" aria-hidden="true" ?hidden=${() => !draftCount(def.key)}>
                              ${() => draftCount(def.key)}
                            </span>
                            <span class="sr-only" ?hidden=${() => !draftCount(def.key)}>
                              ${() => label('selected').replace('{count}', String(draftCount(def.key)))}
                            </span>
                            <ore-button
                              variant="ghost"
                              size="sm"
                              ?disabled=${() => props.disabled.value || !draftCount(def.key)}
                              @click=${() => {
                                if (props.disabled.value) return;
                                draft.value = clearTokens({ text: '', tokens: draft.value }, def.key).tokens;
                              }}>
                              ${() => label('clearFilter').replace('{filter}', def.label)}
                            </ore-button>
                          </div>
                        `
                      : ''
                  }
                  ${
                    def.options.length > 8
                      ? html`
                          <ore-input
                            label=${() => label('searchOptions').replace('{filter}', def.label)}
                            value=${() => searches.value[def.key] ?? ''}
                            @input=${(event: Event) => {
                              event.stopPropagation();
                              const input = event.currentTarget as HTMLElementTagNameMap['ore-input'];
                              searches.value = { ...searches.value, [def.key]: input.value ?? '' };
                            }}>
                            <ore-icon slot="prefix" name="search" size="16" aria-hidden="true"></ore-icon>
                          </ore-input>
                        `
                      : ''
                  }
                  <div class="hidden-selections" ?hidden=${() => !hiddenSelections(def).length}>
                    <p role="status">
                      ${() => {
                        const hidden = hiddenSelections(def);
                        return `${label('hiddenSelected').replace('{count}', String(hidden.length))}. ${label('selectedValues').replace('{values}', hidden.map((option) => option.label).join(', '))}`;
                      }}
                    </p>
                    <ore-button
                      variant="ghost"
                      size="sm"
                      @click=${(event: Event) => {
                        searches.value = { ...searches.value, [def.key]: '' };
                        (event.currentTarget as HTMLElement)
                          .closest('.filter-group')
                          ?.querySelector<HTMLElement>('ore-input')
                          ?.focus();
                      }}>
                      ${() => label('showAll')}
                    </ore-button>
                  </div>
                  ${
                    def.selection === 'multiple'
                      ? html`
                          <div
                            class="filter-choices"
                            role="group"
                            aria-label=${def.label}
                            ?data-cards=${() => usesCards(def)}>
                            ${() =>
                              filteredOptions(def).map(
                                (option) => html`
                                  <ore-checkbox
                                    color="primary"
                                    checked=${() => selected(draft.value, { key: def.key, value: option.value })}
                                    ?disabled=${() => props.disabled.value}
                                    @change=${(event: Event) => {
                                      event.stopPropagation();
                                      if (props.disabled.value) return;
                                      const token = { key: def.key, value: option.value };
                                      const state = { text: '', tokens: draft.value };
                                      draft.value = (
                                        selected(draft.value, token)
                                          ? removeToken(state, token)
                                          : commitToken(state, token, 'multiple')
                                      ).tokens;
                                    }}>
                                    ${optionContent(option)}
                                  </ore-checkbox>
                                `,
                              )}
                          </div>
                        `
                      : html`
                          <ore-radio-group
                            label=${def.label}
                            color="primary"
                            ?data-cards=${() => usesCards(def)}
                            value=${() => {
                              const token = draft.value.find((token) => token.key === def.key);
                              return token
                                ? String(def.options.findIndex((option) => option.value === token.value) + 1)
                                : 'any';
                            }}
                            @change=${(event: CustomEvent<ChoiceChangeDetail>) => {
                              event.stopPropagation();
                              if (props.disabled.value) return;
                              const value = event.detail.values[0];
                              const option = value === 'any' ? undefined : def.options[Number(value) - 1];
                              if (value !== 'any' && !option) return;
                              draft.value = (
                                option
                                  ? commitToken(
                                      { text: '', tokens: draft.value },
                                      { key: def.key, value: option.value },
                                    )
                                  : clearTokens({ text: '', tokens: draft.value }, def.key)
                              ).tokens;
                            }}>
                            <ore-radio value="any">${() => def.anyLabel ?? label('any')}</ore-radio>
                            ${() => {
                              return filteredOptions(def).map(
                                (option) => html`
                                  <ore-radio value=${String(option.index + 1)}>${optionContent(option)}</ore-radio>
                                `,
                              );
                            }}
                          </ore-radio-group>
                        `
                  }
                  <p
                    class="no-options"
                    role="status"
                    ?hidden=${() =>
                      def.options.some((option) =>
                        option.label
                          .toLocaleLowerCase()
                          .includes((searches.value[def.key] ?? '').trim().toLocaleLowerCase()),
                      )}>
                    ${() => label('noOptions')}
                  </p>
                </section>
              `,
            )}
        </div>
        <div class="drawer-footer" slot="footer">
          <p class="pending-changes" role="status">${() => (dirty.value ? label('pending') : '')}</p>
          <div class="filter-actions">
            <ore-button
              variant="ghost"
              ?disabled=${() => !draft.value.length || props.disabled.value}
              @click=${() => {
                draft.value = [];
              }}>
              ${() => label('reset')}
            </ore-button>
            <ore-button
              variant="bordered"
              @click=${() => {
                drawerOpen.value = false;
              }}>
              ${() => label('cancel')}
            </ore-button>
            <ore-button color="primary" @click=${applyFilters}>${() => label('apply')}</ore-button>
          </div>
        </div>
      </ore-drawer>
      <div
        class="dropdown"
        part="dropdown"
        id="${() => `${barId}-dropdown`}"
        popover="manual"
        ?data-open=${() => isOpen.value}
        ref=${(node: HTMLElement | null) => {
          dropdownEl = node;
        }}>
        <div
          role="listbox"
          id="${() => `${barId}-listbox`}"
          aria-label="${() => props.label.value || props.placeholder.value || 'Suggestions'}">
          ${() =>
            isOpen.value && noMatch.value
              ? html`
                  <div class="no-match" role="option" aria-selected="false" aria-disabled="true">
                    ${() => label('noMatch')}
                  </div>
                `
              : ''}
          ${() =>
            isOpen.value && suggestions.value.length > 0
              ? suggestions.value.map(
                  (suggestion, index) => html`
                    <div
                      class="option"
                      role="option"
                      id="${`${barId}-opt-${index}`}"
                      data-option-index="${index}"
                      aria-selected="false"
                      aria-disabled="false"
                      ?data-focused=${() => focusedIndex.value === index}
                      @pointermove="${() => optionList.set(index)}"
                      @click="${() => pick(suggestion)}">
                      <span class="option-label">${suggestion.label}</span>
                      <span class="option-meta">${optionMeta(suggestion)}</span>
                    </div>
                  `,
                )
              : ''}
        </div>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [colorThemeMixin, roundedVariantMixin, srOnlyMixin, componentStyles],
}) as unknown as AddEventListeners<OreQueryBarEvents>;
