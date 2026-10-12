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
import { createListboxDropdown, lifecycleSignal, setAriaReflection } from '../../core';
import { colorThemeMixin, reducedMotionMixin, roundedVariantMixin } from '../../styles';
import type { AddEventListeners, ComponentSize, RoundedSize } from '../../types';
import { dispatchNativeFieldEvent } from '../shared/native-field-event';
import componentStyles from './query-bar.css?inline';
import type { OreQueryBarEvents, OreQueryBarProps } from './query-bar.types';
import {
  commitToken,
  parseQuery,
  type QueryState,
  type QuerySuggestion,
  type QueryToken,
  type QueryTokenDef,
  removeToken,
  suggestQuery,
} from './query-bar-grammar';

export { CHIP_TAG } from '../../feedback/chip/chip';
export { INPUT_TAG } from '../input/input';
export type { OreQueryBarEvents, OreQueryBarProps } from './query-bar.types';
export * from './query-bar-grammar';

/** Fixed row height of one suggestion; the dropdown positions rows against it. */
const OPTION_ROW_HEIGHT = 36;

/**
 * A search field that accepts free text and `key:value` tokens together, in the
 * grammar GitHub's pull-request search made familiar. Committed tokens render as
 * removable pills inside the field; a suggestion dropdown lists the vocabulary's
 * keys and matching values while typing, so phones never need to type a colon.
 *
 * The bar is state-driven: `vocabulary` defines the token keys and their accepted
 * values, `state` carries `{ text, tokens }`, and every edit emits `input` +
 * `change` with the new state readable from the element's `state` property. Omit
 * `state` for uncontrolled use. External `state` writes whose `tokens` array is
 * identical to the current one are treated as echoes — only token changes are
 * adopted — so text-only round-trips never wipe the field's live draft.
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
 *
 * @fires input - The query changed; read the new state from the `state` property
 * @fires change - Same as `input`
 * @fires open-change - The suggestion dropdown opened or closed. detail: { open, reason }
 *
 * @part wrapper - The ore-input field host
 * @part dropdown - The suggestion dropdown container
 * @cssprop --query-bar-min-width - Minimum host width (default 12rem)
 * @cssprop --query-bar-icon-size - Leading search icon size (default 16px)
 * @cssprop --query-bar-option-height - Suggestion row height (default 36px)
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
    placeholder: prop.string(),
    rounded: prop.string<RoundedSize>(),
    size: prop.string<ComponentSize>(),
    state: prop.data<QueryState>(),
    variant: prop.string<'flat' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
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

    const noMatchLabel = computed(() => {
      const draft = parseQuery(field.value, vocabulary()).draft;
      const def = draft ? defBy.value.get(draft.key) : undefined;
      return `No matching ${def?.label ?? draft?.key ?? ''} — searching as text`;
    });

    // Element refs the listbox dropdown needs; resolved as the template renders.
    let inputEl: HTMLInputElement | null = null;
    let fieldEl: HTMLElement | null = null;
    let dropdownEl: HTMLElement | null = null;
    const inputRef = ref<HTMLElement>();

    const optionList = createListboxDropdown<QuerySuggestion>({
      getBoundary: () => el,
      getFocusedOptionElement: () => dropdownEl?.querySelector<HTMLElement>('[data-focused]') ?? null,
      getItems: () => suggestions.value,
      getOptionId: (index) => `${barId}-opt-${index}`,
      getPanel: () => dropdownEl,
      getReference: () => fieldEl,
      getTrigger: () => inputEl,
      isDisabled: () => Boolean(props.disabled.value),
      isItemDisabled: () => false,
      onClose: (reason) => emit('open-change', { open: false, reason }),
      onOpen: (reason) => emit('open-change', { open: true, reason }),
      // The reference is the whole (often full-row) field: matching its width would
      // stretch the panel across the page. The dropdown sizes to its content within
      // its own min/max bounds instead, like a menu.
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

    // Expose the working state as a native-like `.state` property on the host: the
    // live external channel, replacing the prop-installed property exactly as
    // ore-combobox replaces its own `value`. Writes whose `tokens` array matches
    // the working one are consumer echoes (v-model round-trips) and keep the
    // field's live draft; a changed tokens array is an external write — a deep-link
    // preset, a mode switch — and is adopted, field included.
    Object.defineProperty(el, 'state', {
      configurable: true,
      enumerable: true,
      get: () => working.value,
      set: (value: unknown) => {
        const next = normalizeState(value);
        if (next === null || next.tokens === working.value.tokens) return;
        working.value = next;
        field.value = next.text;
      },
    });

    // ── State commits ────────────────────────────────────────────────────────

    function emitChange(): void {
      dispatchNativeFieldEvent(el, 'input');
      dispatchNativeFieldEvent(el, 'change');
    }

    /** Applies the next state locally and announces it; the consumer reads `el.state`. */
    function commit(next: QueryState): void {
      working.value = next;
      emitChange();
    }

    /** Folds parsed tokens into the working set, replacing per key and keeping slots. */
    function mergeTokens(base: QueryToken[], parsed: readonly QueryToken[]): QueryToken[] {
      let tokens = base;
      for (const token of parsed) {
        const slot = tokens.findIndex((candidate) => candidate.key === token.key);
        tokens = slot >= 0 ? [...tokens.slice(0, slot), token, ...tokens.slice(slot + 1)] : [...tokens, token];
      }
      return tokens;
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
      if (canOpen()) optionList.open('keyboard');
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
        commit(commitToken({ text: rest, tokens: working.value.tokens }, suggestion.key, suggestion.value));
      }
      inputEl?.focus();
    }

    function removeChip(event: Event): void {
      event.stopPropagation();
      const key = (event as CustomEvent<{ value?: string }>).detail?.value;
      if (key === undefined) return;
      commit(removeToken(working.value, key));
      // Keep the compose flow: without this, focus falls to the host and the next
      // keystroke goes nowhere.
      inputEl?.focus();
    }

    /** The field's own clear button: clears the free text, never the pills. */
    function clearText(): void {
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
            if (last) commit(removeToken(working.value, last.key));
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
      if (canOpen()) optionList.open('focus');
    };
    watch(() => {
      if (isOpen.value && !canOpen()) optionList.close('programmatic');
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
      fieldEl = bitInputEl;

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
        fieldEl = null;
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
        part="wrapper">
        <div class="prefix" slot="prefix">
          <ore-icon name="search" size="16" aria-hidden="true"></ore-icon>
          <span class="pills">
            ${() =>
              working.value.tokens.map(
                (token) => html`
                  <ore-chip
                    value=${token.key}
                    label=${pillLabel(token)}
                    mode="removable"
                    variant="flat"
                    size="sm"
                    @remove=${removeChip}>
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
            aria-label="Clear"
            tabindex="-1"
            ?hidden="${() => !props.clearable.value || field.value === ''}"
            @click="${clearText}">
            <ore-icon name="x" size="12" stroke-width="2.5" aria-hidden="true"></ore-icon>
          </button>
        </span>
      </ore-input>
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
          style="${() => (isOpen.value && canOpen() ? `height:${(noMatch.value ? 1 : suggestions.value.length) * OPTION_ROW_HEIGHT}px;` : '')}"
          aria-label="${() => props.label.value || props.placeholder.value || 'Suggestions'}">
          ${() =>
            isOpen.value && noMatch.value
              ? html`<div class="no-match" role="option" aria-selected="false" aria-disabled="true">${noMatchLabel.value}</div>`
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
                      style="${`position:absolute;top:0;left:0;right:0;transform:translateY(${index * OPTION_ROW_HEIGHT}px);`}"
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
  styles: [colorThemeMixin, reducedMotionMixin, roundedVariantMixin, componentStyles],
}) as unknown as AddEventListeners<OreQueryBarEvents>;
