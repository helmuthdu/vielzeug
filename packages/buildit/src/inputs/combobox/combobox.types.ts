import type { OverlayCloseDetail, OverlayOpenDetail } from '@vielzeug/craftit/controls';

import type { VisualVariant } from '../../types';
import type { SelectableFieldProps } from '../shared/base-props';
import type { ChoiceChangeDetail } from '../shared/utils';

export type BitComboboxEvents = {
  change: ChoiceChangeDetail;
  close: OverlayCloseDetail;
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

export type ComboboxSelectionItem = {
  label: string;
  value: string;
};

export type BitComboboxProps = SelectableFieldProps<Exclude<VisualVariant, 'glass' | 'text' | 'frost'>> & {
  clearable?: boolean;
  /** Allow typing a new value to create a new option */
  creatable?: boolean;
  /** Show loading state in the dropdown */
  loading?: boolean;
  multiple?: boolean;
  'no-filter'?: boolean;
  options?: ComboboxOptionInput[];
};

export type BitComboboxOptionProps = {
  disabled?: boolean;
  /** Explicit label text; falls back to the element's text content. */
  label?: string;
  value?: string;
};
