import type { Logger } from '../../../packages/rune/src/types';

declare global {
  interface Window {
    defaultLogger: Logger;
  }
}

export {};
