import type { SizeConfig } from '../styles/mixins/shape.css';
import type { ComponentSize } from './types';

/** A preset with an entry for every ComponentSize key. */
type FullSizePreset = Record<ComponentSize, SizeConfig>;

/** A preset that may omit some ComponentSize keys (sizeVariantMixin fills the gaps with its defaults). */
type PartialSizePreset = Partial<Record<ComponentSize, SizeConfig>>;

export const FIELD_SIZE_PRESET = {
  lg: {
    '--_field-height': 'var(--size-12)',
    '--_padding': 'var(--size-2-5) var(--size-3-5)',
    fontSize: 'var(--text-base)',
    gap: 'var(--size-2-5)',
  },
  md: {
    '--_field-height': 'var(--size-10)',
    '--_padding': 'var(--size-1-5) var(--size-3)',
    fontSize: 'var(--text-sm)',
    gap: 'var(--size-2)',
  },
  sm: {
    '--_field-height': 'var(--size-8)',
    '--_padding': 'var(--size-1) var(--size-2)',
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-1-5)',
  },
} satisfies FullSizePreset;

export const TEXTAREA_SIZE_PRESET = {
  lg: {
    '--_padding': 'var(--size-2-5) var(--size-3-5)',
    fontSize: 'var(--text-base)',
    gap: 'var(--size-2-5)',
  },
  md: {
    '--_padding': 'var(--size-1-5) var(--size-3)',
    fontSize: 'var(--text-sm)',
    gap: 'var(--size-2)',
  },
  sm: {
    '--_padding': 'var(--size-1) var(--size-2)',
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-1-5)',
  },
} satisfies FullSizePreset;

/** Shared size preset for checkbox and radio (icon + label layout). */
export const CONTROL_SIZE_PRESET = {
  lg: {
    fontSize: 'var(--text-base)',
    gap: 'var(--size-2-5)',
    size: 'var(--size-6)',
  },
  sm: {
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-1-5)',
    size: 'var(--size-4)',
  },
} satisfies PartialSizePreset;

/** Shared size preset for the switch toggle control. */
export const SWITCH_SIZE_PRESET = {
  lg: {
    fontSize: 'var(--text-base)',
    gap: 'var(--size-3)',
    height: 'var(--size-7)',
    thumbSize: 'var(--size-6)',
    width: 'var(--size-14)',
  },
  sm: {
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-2)',
    height: 'var(--size-5)',
    thumbSize: 'var(--size-4)',
    width: 'var(--size-9)',
  },
} satisfies PartialSizePreset;

/** Shared size preset for the slider track/thumb. */
export const SLIDER_SIZE_PRESET = {
  lg: {
    fontSize: 'var(--text-base)',
    height: 'calc(var(--size-5) - var(--size-1))',
    size: 'var(--size-5)',
  },
  md: {
    fontSize: 'var(--text-base)',
    height: 'var(--size-3)',
    size: 'var(--size-5)',
  },
  sm: {
    fontSize: 'var(--text-xs)',
    height: 'var(--size-2)',
    size: 'var(--size-4)',
  },
} satisfies FullSizePreset;

/**
 * Size preset for the message composer card. Padding is symmetric (unlike
 * `TEXTAREA_SIZE_PRESET`'s field-shaped padding) since this scales a card that wraps a field
 * *and* a toolbar row, not a bare field — `md`'s padding matches the value the card used before
 * `size` scaled anything, so the default look is unchanged.
 */
export const MESSAGE_COMPOSER_SIZE_PRESET = {
  lg: {
    '--_padding': 'var(--size-4)',
    fontSize: 'var(--text-base)',
    gap: 'var(--size-2-5)',
  },
  md: {
    '--_padding': 'var(--size-3)',
    fontSize: 'var(--text-sm)',
    gap: 'var(--size-2)',
  },
  sm: {
    '--_padding': 'var(--size-2)',
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-1-5)',
  },
} satisfies FullSizePreset;

/**
 * Size preset for `ore-menu`'s floating panel, `ore-menu-item`'s row, and `ore-menu-separator`'s
 * margin. `--_panel-padding`, `--_item-padding`, and `--_separator-margin` are custom pass-through
 * keys (not one of `SizeConfig`'s named slots) since the panel, its items, and its separators each
 * need independently-scaling spacing; `md`'s values match what `menu.css`/`menu-item.css`/
 * `menu-separator.css` hardcoded before `size` was wired up, so the default look is unchanged.
 * `--_font-size`/`--_gap` are inherited by `ore-menu-item` from `ore-menu`'s own host — custom
 * properties cascade down through light-DOM children the same way they cascade into a shadow root.
 */
export const MENU_SIZE_PRESET = {
  lg: {
    '--_item-padding': 'var(--size-2) var(--size-3-5)',
    '--_panel-padding': 'var(--size-1-5)',
    '--_separator-margin': 'var(--size-1-5)',
    fontSize: 'var(--text-base)',
    gap: 'var(--size-2-5)',
  },
  md: {
    '--_item-padding': 'var(--size-1-5) var(--size-3)',
    '--_panel-padding': 'var(--size-1)',
    '--_separator-margin': 'var(--size-1)',
    fontSize: 'var(--text-sm)',
    gap: 'var(--size-2)',
  },
  sm: {
    '--_item-padding': 'var(--size-1) var(--size-2-5)',
    '--_panel-padding': 'var(--size-0-5)',
    '--_separator-margin': 'var(--size-0-5)',
    fontSize: 'var(--text-xs)',
    gap: 'var(--size-1-5)',
  },
} satisfies FullSizePreset;

/** Shared size preset for the file-input dropzone. */
export const FILE_INPUT_SIZE_PRESET = {
  lg: {
    '--_min-height': 'var(--size-40)',
    fontSize: 'var(--text-base)',
  },
  md: {
    '--_min-height': 'var(--size-32)',
    fontSize: 'var(--text-sm)',
  },
  sm: {
    '--_min-height': 'var(--size-28)',
    fontSize: 'var(--text-xs)',
  },
} satisfies FullSizePreset;
