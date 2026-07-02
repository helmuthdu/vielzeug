import { buildCspExample } from './build-csp';
import { buildDocumentExample } from './build-document';
import { errorNormalizeExample } from './error-normalize';
import { renderBasicExample } from './render-basic';
import { renderStateExample } from './render-state';

// createSandbox() renders into a real <iframe srcdoc> and awaits a postMessage
// 'ready' signal from a script inside it. jsdom (used by `validate:repl`) does
// not execute iframe srcdoc scripts, so render()'s Promise never resolves there —
// these examples are browser-only but run correctly in the live REPL.
const browserOnly = true;

export const sandboxExamples = {
  'build-csp': buildCspExample,
  'build-document': buildDocumentExample,
  'error-normalize': errorNormalizeExample,
  'render-basic': { ...renderBasicExample, browserOnly },
  'render-state': { ...renderStateExample, browserOnly },
};
