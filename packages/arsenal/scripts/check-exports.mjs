import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(packageRoot, 'src');

const readText = (filePath) => readFile(filePath, 'utf8');

const normalize = (value) => value.replace(/\\/g, '/');

const getBarrelExports = async (filePath) => {
  const source = await readText(filePath);
  const matches = [...source.matchAll(/^export \* from '([^']+)';$/gm)];

  return matches.map(([, specifier]) => specifier).sort();
};

const getLeafModules = async (directoryPath) => {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.ts'))
    .filter((name) => !name.endsWith('.d.ts'))
    .filter((name) => !name.startsWith('_'))
    .filter((name) => name !== 'index.ts')
    .map((name) => name.slice(0, -3))
    .sort();
};

const getArsenalSections = async () => {
  const entries = await readdir(srcRoot, { withFileTypes: true });
  const sections = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const indexPath = path.join(srcRoot, entry.name, 'index.ts');

    try {
      await readFile(indexPath, 'utf8');
      sections.push(entry.name);
    } catch {
      continue;
    }
  }

  return sections.sort();
};

const assertEqualSet = (label, actual, expected) => {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((value) => !actualSet.has(value));
  const extra = actual.filter((value) => !expectedSet.has(value));

  if (missing.length === 0 && extra.length === 0) {
    return;
  }

  const parts = [label];

  if (missing.length > 0) {
    parts.push(`missing: ${missing.join(', ')}`);
  }

  if (extra.length > 0) {
    parts.push(`extra: ${extra.join(', ')}`);
  }

  throw new Error(parts.join(' | '));
};

const main = async () => {
  const packageJson = JSON.parse(await readText(path.join(packageRoot, 'package.json')));
  const sections = await getArsenalSections();
  const expectedExportKeys = ['.', ...sections.map((section) => `./${section}`)].sort();
  const actualExportKeys = Object.keys(packageJson.exports).sort();

  assertEqualSet('Arsenal package exports do not match src sections', actualExportKeys, expectedExportKeys);

  const expectedRootExport = {
    source: './src/index.ts',
    types: './dist/index.d.ts',
    import: './dist/index.js',
    require: './dist/index.cjs',
  };

  for (const [field, expectedValue] of Object.entries(expectedRootExport)) {
    if (packageJson.exports['.']?.[field] !== expectedValue) {
      throw new Error(
        `Arsenal export "." has unexpected ${field}: expected ${expectedValue}, received ${packageJson.exports['.']?.[field]}`,
      );
    }
  }

  for (const section of sections) {
    const exportEntry = packageJson.exports[`./${section}`];
    const expectedEntry = {
      source: `./src/${section}/index.ts`,
      types: `./dist/${section}/index.d.ts`,
      import: `./dist/${section}/index.js`,
      require: `./dist/${section}/index.cjs`,
    };

    for (const [field, expectedValue] of Object.entries(expectedEntry)) {
      if (exportEntry?.[field] !== expectedValue) {
        throw new Error(
          `Arsenal export "./${section}" has unexpected ${field}: expected ${expectedValue}, received ${exportEntry?.[field]}`,
        );
      }
    }

    const expectedBarrelModules = (await getLeafModules(path.join(srcRoot, section))).map(
      (moduleName) => `./${moduleName}`,
    );
    const actualBarrelModules = await getBarrelExports(path.join(srcRoot, section, 'index.ts'));

    assertEqualSet(
      `Arsenal subpath barrel drift in src/${section}/index.ts`,
      actualBarrelModules,
      expectedBarrelModules,
    );
  }

  const rootEntries = await readdir(srcRoot, { withFileTypes: true });
  const rootFiles = rootEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.ts'))
    .filter((name) => !name.endsWith('.d.ts'))
    .filter((name) => !name.startsWith('_'))
    .filter((name) => name !== 'index.ts')
    .map((name) => `./${name.slice(0, -3)}`);

  const sectionModules = [];

  for (const section of sections) {
    const modules = await getLeafModules(path.join(srcRoot, section));

    sectionModules.push(...modules.map((moduleName) => normalize(`./${section}/${moduleName}`)));
  }

  const actualRootModules = await getBarrelExports(path.join(srcRoot, 'index.ts'));
  const expectedRootBarrelModules = [...rootFiles, ...sectionModules].sort();

  assertEqualSet('Arsenal root barrel drift in src/index.ts', actualRootModules, expectedRootBarrelModules);
};

await main();
