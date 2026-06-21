import type { Scheduler } from './types';

export const DEFAULT_SCHEDULER: Scheduler = {
  delay(fn, ms) {
    const id = setTimeout(fn, ms);

    return () => clearTimeout(id);
  },
  repeat(fn, ms) {
    const id = setInterval(fn, ms);

    return () => clearInterval(id);
  },
};
