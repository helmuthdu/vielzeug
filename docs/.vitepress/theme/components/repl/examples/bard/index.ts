import { busesDuckingExample } from './buses-ducking';
import { synthBasicExample } from './synth-basic';

// Web Audio (AudioContext) does not exist in jsdom, so `validate:repl` cannot
// execute these in Node; they run correctly in the live browser REPL.
const browserOnly = true;

export const bardExamples = {
  'buses-ducking': { ...busesDuckingExample, browserOnly },
  'synth-basic': { ...synthBasicExample, browserOnly },
};
