/** Unique ID generation for component and ARIA relationships. */

let counter = 0;
const tag = Math.random().toString(36).slice(2, 6);

/** @internal Reset by the testing cleanup path. */
export const _resetIdCounter = (): void => {
  counter = 0;
};

/** Generate a collision-resistant ID with an optional semantic prefix. */
export const createId = (prefix = 'id'): string => `${prefix}-${tag}${++counter}`;
