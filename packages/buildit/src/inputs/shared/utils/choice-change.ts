export type ChoiceChangeDetail = {
  labels: string[];
  originalEvent?: Event;
  value: string;
  values: string[];
};

export function createChoiceChangeDetail(
  values: string[],
  labels: string[],
  originalEvent?: Event,
): ChoiceChangeDetail {
  return {
    labels,
    originalEvent,
    value: values.join(','),
    values,
  };
}
