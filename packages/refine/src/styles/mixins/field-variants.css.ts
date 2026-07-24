import { css } from '@vielzeug/ore';

export type FieldVariantMixinOptions = {
  /**
   * The theme accent custom property `flat`/`bordered` mix into their border color. Defaults to
   * `--_theme-focus` (from `colorThemeMixin`). Override for a component with its own distinct
   * focus/accent concept instead of the shared theme token (`ore-otp-input`'s `--_cell-focus-
   * border`, which isn't theme-color-driven the same way).
   */
  accentVar?: string;
  /** Selector for the element that gets the variant's background/border/shadow — the visual "box". */
  container: string;
  /**
   * Selector for the text-bearing element the `bordered` variant tints to the theme color.
   * Defaults to `container` for components where the box and the text-bearing element are the
   * same node (`ore-input`/`ore-textarea`'s `.field`). Pass a distinct selector when they're
   * split (`ore-message-composer`'s `.composer` card vs its bare `.field` textarea).
   */
  text?: string;
  /** CSS custom-property namespace, e.g. `'input'` → `--input-bg`, `--input-hover-bg`, ... */
  tokenPrefix: string;
};

/**
 * The `solid`/`flat`/`bordered`/`outline`/`ghost` variant switch shared by every text-entry
 * field component (`ore-input`, `ore-textarea`, `ore-message-composer`, `ore-otp-input`) —
 * previously hand-duplicated across them, mostly identically but not quite: this version also
 * uniformly adds a `:not([disabled])` guard to the `flat` variant's hover/focus rules (only
 * `ore-message-composer` had it) and the `bordered` variant's text/placeholder/caret tint
 * (`ore-input`/`ore-otp-input` were missing pieces of it) — clearly-unintentional per-component
 * gaps, not deliberate differences, so this mixin converges on the more complete behavior for
 * every consumer rather than picking one component's version arbitrarily.
 *
 * Deliberately does **not** touch `:focus-within` box-shadow for `solid`/`outline`/`ghost` —
 * every current consumer already covers that with its own single `:host(:not([disabled],
 * [variant='flat'], ...)) ${container}:focus-within` catch-all in its *own* base layer, so a
 * copy here would be pure redundancy for them, and actively wrong for `ore-otp-input`: its
 * `.cell` is the focusable element itself (not a wrapper), so `:focus-within` matches on every
 * keystroke, and it already renders its own bespoke ring (colored by `accentVar`, not
 * `--_theme-shadow`) uniformly across all variants in its base layer — this mixin adding a
 * second, generic one would fight it depending on layer/rule order.
 *
 * Each component keeps its own `:host(:not([variant], ...)) ${container}:hover/:focus-within`
 * base-state rules and any variant beyond this shared set (e.g. `ore-input`'s extra `'text'`
 * variant) in its own stylesheet — this mixin only covers the five variants every consumer has
 * in common.
 *
 * @example
 * ```ts
 * // ore-textarea / ore-input (box and text-bearing element are the same `.field`)
 * styles: [..., fieldVariantMixin({ container: '.field', tokenPrefix: 'textarea' }), componentStyles]
 *
 * // ore-message-composer (card `.composer` vs its own bare `.field` textarea)
 * styles: [
 *   ...,
 *   fieldVariantMixin({ container: '.composer', text: '.field', tokenPrefix: 'message-composer' }),
 *   componentStyles,
 * ]
 *
 * // ore-otp-input (own per-cell accent instead of the shared theme-focus token)
 * styles: [
 *   ...,
 *   fieldVariantMixin({ accentVar: '--_cell-focus-border', container: '.cell', tokenPrefix: 'otp-cell' }),
 *   componentStyles,
 * ]
 * ```
 */
export const fieldVariantMixin = ({
  accentVar = '--_theme-focus',
  container,
  text = container,
  tokenPrefix,
}: FieldVariantMixinOptions) => css`
  @layer refine.variants {
    /* Solid (default) */
    :host(:not([variant])),
    :host([variant='solid']) {
      --_bg: var(--${tokenPrefix}-bg, var(--color-contrast-50));
      --_border-color: var(--${tokenPrefix}-border-color, var(--color-contrast-300));
    }

    :host(:not([variant])) ${container}, :host([variant='solid']) ${container} {
      box-shadow: var(--shadow-2xs);
    }

    /* Flat */
    :host([variant='flat']) {
      --_bg: var(--${tokenPrefix}-bg, var(--color-contrast-100));
      --_border-color: var(--${tokenPrefix}-border-color, color-mix(in oklch, var(${accentVar}) 20%, transparent));
    }

    :host([variant='flat']) ${container} {
      box-shadow: var(--inset-shadow-2xs);
    }

    :host([variant='flat']:not([disabled])) ${container}:hover {
      background: var(--${tokenPrefix}-hover-bg, color-mix(in oklch, var(--_theme-base) 6%, var(--color-contrast-100)));
      border-color: var(
        --${tokenPrefix}-hover-border-color,
        color-mix(in oklch, var(--_theme-base) 35%, var(--color-contrast-300))
      );
    }

    :host([variant='flat']:not([disabled])) ${container}:focus-within {
      background: var(--${tokenPrefix}-focus-bg, color-mix(in oklch, var(--_theme-base) 8%, var(--color-canvas)));
      border-color: var(--${tokenPrefix}-focus-border-color, color-mix(in oklch, var(${accentVar}) 60%, transparent));
      box-shadow: var(--_theme-shadow);
    }

    /* Bordered */
    :host([variant='bordered']) {
      --_bg: var(--${tokenPrefix}-bg, var(--_theme-backdrop));
      --_border-color: var(--${tokenPrefix}-border-color, color-mix(in oklch, var(${accentVar}) 70%, transparent));
    }

    :host([variant='bordered']:not([disabled])) ${container}:hover {
      border-color: var(--${tokenPrefix}-hover-border-color, var(${accentVar}));
    }

    :host([variant='bordered']) ${text} {
      color: var(--_theme-base);
      caret-color: var(--_theme-base);
    }

    :host([variant='bordered']) ${text}::placeholder {
      color: var(--${tokenPrefix}-placeholder-color, color-mix(in oklch, var(--_theme-base) 45%, transparent));
    }

    /* Outline — border always visible, so unlike the other variants it can't lean on a
       per-component \`:host{}\` base fallback for \`--_border-color\` that may or may not exist
       (\`ore-message-composer\` has none — every other rule here sets both custom properties, so
       its base layer omits a default on the assumption that always holds). Set explicitly. */
    :host([variant='outline']) {
      --_bg: var(--${tokenPrefix}-bg, transparent);
      --_border-color: var(--${tokenPrefix}-border-color, var(--color-contrast-300));
    }

    :host([variant='outline']) ${container} {
      box-shadow: none;
    }

    /* Ghost */
    :host([variant='ghost']) {
      --_bg: var(--${tokenPrefix}-bg, transparent);
      --_border-color: var(--${tokenPrefix}-border-color, transparent);
    }

    :host([variant='ghost']) ${container} {
      box-shadow: none;
    }

    :host([variant='ghost']:not([disabled])) ${container}:hover {
      background: var(--${tokenPrefix}-hover-bg, var(--color-contrast-100));
    }
  }
`;
