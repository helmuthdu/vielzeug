import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..');

const FORBIDDEN = [
  '@vielzeug/courier',
  '@vielzeug/sentinel',
  '@vielzeug/ripple',
  '@vielzeug/herald',
  '@vielzeug/rune',
  '@vielzeug/spell',
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(path);
  }
  return out;
}

describe('Postmaster import boundaries', () => {
  it('root entry point does not import Courier, Sentinel, Ripple, Herald, Rune, or Spell', () => {
    const files = sourceFiles(SRC).filter((file) => !file.includes('indexeddb') && !file.includes('__tests__'));
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const dep of FORBIDDEN) {
        if (content.includes(dep)) violations.push(`${file}: ${dep}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
