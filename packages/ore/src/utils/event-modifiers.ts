import { warn } from '../_dev';
import { ORE_ERRORS } from '../errors';

type EventHandler = (e: Event) => void;

const behaviorModifiers: Record<string, (h: EventHandler) => EventHandler> = {
  prevent: (h) => (e) => {
    e.preventDefault();
    h(e);
  },
  self: (h) => (e) => {
    if (e.target === e.currentTarget) h(e);
  },
  stop: (h) => (e) => {
    e.stopPropagation();
    h(e);
  },
};

const optionModifiers: Record<string, 'capture' | 'once' | 'passive'> = {
  capture: 'capture',
  once: 'once',
  passive: 'passive',
};

/**
 * Apply event listener modifiers (prevent, stop, self, capture, once, passive).
 * Behavior modifiers wrap the handler; listener options are extracted separately.
 * Unknown modifiers (almost always typos, e.g. `@click.preven`) warn in dev —
 * silently binding an unmodified handler hid the mistake.
 */
export const applyModifiers = (
  eventName: string,
  handler: EventHandler,
  modifiers: string[],
): { handler: EventHandler; options?: AddEventListenerOptions } => {
  let wrappedHandler = handler;
  const options: AddEventListenerOptions = {};

  for (const modifier of modifiers) {
    const wrap = behaviorModifiers[modifier];
    const optionKey = optionModifiers[modifier];

    if (wrap) {
      wrappedHandler = wrap(wrappedHandler);
    } else if (optionKey) {
      options[optionKey] = true;
    } else {
      warn(ORE_ERRORS.unknownEventModifier(modifier, eventName));
    }
  }

  return { handler: wrappedHandler, ...(Object.keys(options).length ? { options } : {}) };
};
