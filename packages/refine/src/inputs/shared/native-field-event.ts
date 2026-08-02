type FieldHost = HTMLElement & {
  checked?: boolean;
  value?: string;
};

export const defineFieldChecked = (host: HTMLElement, get: () => boolean, set: (checked: boolean) => void): void => {
  Object.defineProperty(host, 'checked', {
    configurable: true,
    enumerable: true,
    get,
    set,
  });
};

export const defineFieldValue = (host: HTMLElement, get: () => string, set: (value: string) => void): void => {
  Object.defineProperty(host, 'value', {
    configurable: true,
    enumerable: true,
    get,
    set,
  });
};

export const dispatchNativeFieldEvent = (host: HTMLElement, type: 'change' | 'input'): void => {
  host.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
};

export const setFieldChecked = (host: HTMLElement, checked: boolean): void => {
  (host as FieldHost).checked = checked;
};

export const setFieldValue = (host: HTMLElement, value: string): void => {
  (host as FieldHost).value = value;
};
