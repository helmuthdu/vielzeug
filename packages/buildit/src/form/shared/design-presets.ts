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
} as const;

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
} as const;

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
} as const;

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
} as const;

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
} as const;

/** Shared size preset for the file-input dropzone. */
export const FILE_INPUT_SIZE_PRESET = {
  lg: {
    '--_min-height': 'var(--size-40)',
    fontSize: 'var(--text-base)',
  },
  sm: {
    '--_min-height': 'var(--size-28)',
    fontSize: 'var(--text-xs)',
  },
} as const;
