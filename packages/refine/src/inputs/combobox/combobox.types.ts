import type { ChoiceChangeDetail, DropdownCloseReason, OverlayOpenDetail } from '../../headless';
import type { SelectableFieldProps } from '../../shared';
import type { VisualVariant } from '../../types';

export type OreComboboxEvents = {
  change: ChoiceChangeDetail;
  close: { reason: DropdownCloseReason };
  open: OverlayOpenDetail;
  search: { query: string };
};

export type ComboboxOptionInput = {
  disabled?: boolean;
  iconEl?: Element | null;
  label?: string;
  value: string;
};

export type ComboboxOptionItem = {
  disabled: boolean;
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
  /** Show loading state in the dropdown */
  loading?: boolean;
  multiple?: boolean;
  'no-filter'?: boolean;
  options?: ComboboxOptionInput[];
  value?: string | string[];
};

export type OreComboboxOptionProps = {
  disabled?: boolean;
  /** Explicit label text; falls back to the element's text content. */
  label?: string;
  value?: string;
};
