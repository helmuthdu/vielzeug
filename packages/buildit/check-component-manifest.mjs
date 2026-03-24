import { readFileSync } from 'node:fs';

import { componentManifest, componentNames, getComponentExportTargets } from './component-manifest.mjs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const exportsField = packageJson.exports ?? {};

const ignoredExportKeys = new Set([
  '.',
  './types',
  './styles',
  './styles/animation.css',
  './styles/layers.css',
  './styles/styles.css',
  './styles/theme.css',
]);

const expectedComponentKeys = new Set(componentNames.map((name) => `./${name}`));
const actualComponentKeys = Object.keys(exportsField).filter(
  (key) => key.startsWith('./') && !ignoredExportKeys.has(key),
);

const missing = [...expectedComponentKeys].filter((key) => !actualComponentKeys.includes(key));
const extra = actualComponentKeys.filter((key) => !expectedComponentKeys.has(key));

if (missing.length || extra.length) {
  const details = [
    missing.length ? `Missing package exports: ${missing.join(', ')}` : '',
    extra.length ? `Unexpected package exports: ${extra.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  throw new Error(`buildit component manifest is out of sync with package.json exports.\n${details}`);
}

for (const component of componentManifest) {
  const key = `./${component.name}`;
  const entry = exportsField[key];

  if (!entry || typeof entry !== 'object') {
    throw new Error(`Export ${key} must be an object with types/import/require targets.`);
  }

  const expected = getComponentExportTargets(component);

  for (const [field, value] of Object.entries(expected)) {
    if (entry[field] !== value) {
      throw new Error(
        `Export ${key} has unexpected ${field} target: expected ${value}, received ${entry[field] ?? 'undefined'}.`,
      );
    }
  }
}

console.log(`buildit component manifest verified for ${componentNames.length} component exports.`);
