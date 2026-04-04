import { readFileSync, writeFileSync } from 'node:fs';

import { getComponentExports } from './component-manifest.mjs';

const packageJsonUrl = new URL('./package.json', import.meta.url);
const packageJson = JSON.parse(readFileSync(packageJsonUrl, 'utf8'));
const componentExports = getComponentExports();
const componentExportKeys = new Set(Object.keys(componentExports));

const staticExports = Object.fromEntries(
  Object.entries(packageJson.exports ?? {}).filter(([key]) => !componentExportKeys.has(key)),
);

packageJson.exports = {
  ...staticExports,
  ...componentExports,
};

const nextContent = `${JSON.stringify(packageJson, null, 2)}\n`;
const prevContent = readFileSync(packageJsonUrl, 'utf8');

if (prevContent !== nextContent) {
  writeFileSync(packageJsonUrl, nextContent);
  console.log(`Synced ${componentExportKeys.size} buildit component exports in package.json.`);
} else {
  console.log(`Buildit package exports already in sync for ${componentExportKeys.size} components.`);
}
