import { parseCsvValues } from './field-values';

export type ControlledCsvState = {
  firstValue: string;
  formValue: string;
  isEmpty: boolean;
  values: string[];
};

export function computeControlledCsvState(value: string | undefined): ControlledCsvState {
  const values = parseCsvValues(value);

  return {
    firstValue: values[0] ?? '',
    formValue: values.join(','),
    isEmpty: values.length === 0,
    values,
  };
}
