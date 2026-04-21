export const getSlottedByTag = (host: HTMLElement, tag: string): HTMLElement[] =>
  Array.from(host.getElementsByTagName(tag)) as HTMLElement[];

export const setMaybeAttribute = (el: HTMLElement, name: string, value: string | undefined): void => {
  if (value) el.setAttribute(name, value);
  else el.removeAttribute(name);
};

export const setBooleanAttribute = (el: HTMLElement, name: string, active: boolean): void => {
  el.toggleAttribute(name, active);
};

export const getChoiceLabel = (items: HTMLElement[], value: string): string => {
  const item = items.find((el) => (el.getAttribute('value') ?? '') === value);

  return item?.textContent?.replace(/\s+/g, ' ').trim() || value;
};
