import { describe, expect, it } from 'vitest';

import { eventFieldChecked, eventFieldValue } from '../native-field-event';

function fireOn(target: EventTarget & { value?: string; checked?: boolean }): Event {
  const event = new Event('change');
  Object.defineProperty(event, 'currentTarget', { value: target });
  return event;
}

describe('eventFieldValue', () => {
  it('reads a string value off the event target', () => {
    const input = document.createElement('input');
    input.value = 'hello';

    expect(eventFieldValue(fireOn(input))).toBe('hello');
  });

  it('returns undefined when the target has no string value', () => {
    const div = document.createElement('div');

    expect(eventFieldValue(fireOn(div))).toBeUndefined();
  });

  it('returns undefined when there is no current target', () => {
    expect(eventFieldValue(new Event('change'))).toBeUndefined();
  });
});

describe('eventFieldChecked', () => {
  it('reads a boolean checked flag off the event target', () => {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = true;

    expect(eventFieldChecked(fireOn(box))).toBe(true);
  });

  it('returns false when the target has no boolean checked', () => {
    const div = document.createElement('div');

    expect(eventFieldChecked(fireOn(div))).toBe(false);
  });

  it('returns false when there is no current target', () => {
    expect(eventFieldChecked(new Event('change'))).toBe(false);
  });
});
