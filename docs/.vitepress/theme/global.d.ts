import type { LogitInstance } from '../../../packages/logit/src/logit';

declare global {
  interface Window {
    Logit: LogitInstance;
  }
}

export {};
