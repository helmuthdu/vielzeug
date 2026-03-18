import { parseCsvValues, stringifyCsvValues } from '../../utils';

// ─── Selection utilities ────────────────────────────────────────────────────

export type ItemWithValue = {
  value: string;
};

export function toggleStringValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function removeStringValue(values: string[], value: string): string[] {
  return values.filter((v) => v !== value);
}

export function toggleItemByValue<T extends ItemWithValue>(items: T[], item: T): T[] {
  return items.some((current) => current.value === item.value)
    ? items.filter((current) => current.value !== item.value)
    : [...items, item];
}

export function removeItemByValue<T extends ItemWithValue>(items: T[], value: string): T[] {
  return items.filter((item) => item.value !== value);
}

export function mapItemValues<T extends ItemWithValue>(items: T[]): string[] {
  return items.map((item) => item.value);
}

// ─── Controlled value synchronization (CSV ↔ internal state) ───────────────

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
    formValue: stringifyCsvValues(values),
    isEmpty: values.length === 0,
    values,
  };
}

export function mapControlledValues<T>(values: string[], toItem: (value: string) => T): T[] {
  return values.map(toItem);
}
