import type { OverlayOpenChangeDetail } from '../../core';
import type { SelectableFieldProps } from '../../shared';
import type { VisualVariant } from '../../types';

export type OreComboboxEvents = {
  change: Event;
  input: Event;
  'open-change': OverlayOpenChangeDetail;
  search: { query: string };
};

export type ComboboxOptionInput = {
  disabled?: boolean;
  /** Explanation displayed and announced when the option is disabled. */
  disabledReason?: string;
  iconEl?: Element | null;
  label?: string;
  value: string;
};

export type ComboboxOptionItem = {
  disabled: boolean;
  disabledReason?: string;
  iconEl: Element | null;
  label: string;
  value: string;
};

export type OreComboboxProps = Omit<
  SelectableFieldProps<Exclude<VisualVariant, 'text' | 'frost'>>,
  'label-placement' | 'value'
> & {
  /** Automatically close the dropdown after selecting an option (even in multiple mode) */
  autoclose?: boolean;
  /** Allow typing a new value to create a new option */
  creatable?: boolean;
  'label-placement'?: 'outside' | 'inset';
  /** Hide the visible label while preserving the combobox's accessible name. */
  'hide-label'?: boolean;
  /** Show loading state in the dropdown */
  loading?: boolean;
  multiple?: boolean;
  'no-filter'?: boolean;
  options?: ComboboxOptionInput[];
  /** Require a non-blank selection for native form validation */
  required?: boolean;
  value?: string | string[];
};

export type OreComboboxOptionProps = {
  disabled?: boolean;
  /** Explanation displayed and announced when the option is disabled. */
  'disabled-reason'?: string;
  /** Explicit label text; falls back to the element's text content. */
  label?: string;
  value?: string;
};
