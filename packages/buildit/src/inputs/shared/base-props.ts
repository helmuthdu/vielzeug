import type { DisablableProps, RoundedSize, SizableProps, ThemableProps, VisualVariant } from '../../types';

export type BaseFormProps = ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Error message (marks field as invalid) */
    error?: string;
    /** Full width mode (100% of container) */
    fullwidth?: boolean;
    /** Helper text displayed below the field */
    helper?: string;
    /** Label text */
    label?: string;
    /** Label placement */
    'label-placement'?: 'inset' | 'outside';
    /** Form field name */
    name?: string;
  };

type FieldVisualProps<TVariant extends VisualVariant> = {
  /** Border radius size */
  rounded?: RoundedSize | '';
  /** Visual style variant */
  variant?: TVariant;
};

export type TextFieldProps<TVariant extends VisualVariant> = BaseFormProps &
  FieldVisualProps<TVariant> & {
    /** Placeholder text */
    placeholder?: string;
    /** Make the field read-only */
    readonly?: boolean;
    /** Mark the field as required */
    required?: boolean;
    /** Current value */
    value?: string;
  };

export type SelectableFieldProps<TVariant extends VisualVariant> = BaseFormProps &
  FieldVisualProps<TVariant> & {
    /** Placeholder text when no option is selected */
    placeholder?: string;
    /** Current value */
    value?: string;
  };
