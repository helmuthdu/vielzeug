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

/**
 * Apply event listener modifiers (prevent, stop, self, capture, once, passive).
 * Behavior modifiers wrap the handler; listener options are extracted separately.
 */
export const applyModifiers = (
  handler: EventHandler,
  modifiers: string[],
): { handler: EventHandler; options?: AddEventListenerOptions } => {
  let wrappedHandler = handler;

  for (const modifier of modifiers) {
    const wrap = behaviorModifiers[modifier];

    if (wrap) wrappedHandler = wrap(wrappedHandler);
  }

  const options: AddEventListenerOptions = {};

  if (modifiers.includes('capture')) options.capture = true;

  if (modifiers.includes('once')) options.once = true;

  if (modifiers.includes('passive')) options.passive = true;

  return { handler: wrappedHandler, ...(Object.keys(options).length ? { options } : {}) };
};
