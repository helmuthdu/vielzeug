import type { LogitInstance } from '../../../packages/rune/src/rune';

declare global {
  interface Window {
    Rune: LogitInstance;
  }
}

export {};
