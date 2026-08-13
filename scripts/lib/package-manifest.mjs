function stripSourceCondition(value) {
  if (Array.isArray(value)) return value.map(stripSourceCondition);
  if (typeof value !== 'object' || value === null) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'source')
      .map(([key, child]) => [key, stripSourceCondition(child)]),
  );
}

function findTypesPath(value) {
  if (Array.isArray(value)) {
    for (const child of value) {
      const path = findTypesPath(child);
      if (path) return path;
    }

    return undefined;
  }
  if (typeof value !== 'object' || value === null) return undefined;
  if (typeof value.types === 'string') return value.types;

  for (const child of Object.values(value)) {
    const path = findTypesPath(child);
    if (path) return path;
  }

  return undefined;
}

function createTypesVersions(exportsField, current = {}) {
  if (typeof exportsField !== 'object' || exportsField === null || Array.isArray(exportsField)) {
    return Object.keys(current).length === 0 ? undefined : current;
  }

  const generated = Object.fromEntries(
    Object.entries(exportsField)
      .filter(([subpath]) => subpath.startsWith('./') && subpath !== '.')
      .flatMap(([subpath, entry]) => {
        const types = findTypesPath(entry);

        return types ? [[subpath.slice(2), [types.replace(/^\.\//, '')]]] : [];
      }),
  );
  const existing = current['*'] ?? {};

  if (Object.keys(generated).length === 0 && Object.keys(current).length === 0) return undefined;

  return { ...current, '*': { ...generated, ...existing } };
}

const MANIFEST_FIELD_ORDER = [
  'name',
  'version',
  'private',
  'description',
  'keywords',
  'homepage',
  'repository',
  'bugs',
  'license',
  'author',
  'funding',
  'packageManager',
  'type',
  'root',
  'engines',
  'workspaces',
  'files',
  'main',
  'module',
  'types',
  'exports',
  'typesVersions',
  'bin',
  'sideEffects',
  'publishConfig',
  'scripts',
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'devDependencies',
];

function orderManifest(manifest) {
  const known = new Set(MANIFEST_FIELD_ORDER);
  const entries = [
    ...MANIFEST_FIELD_ORDER.filter((key) => key in manifest).map((key) => [key, manifest[key]]),
    ...Object.keys(manifest)
      .filter((key) => !known.has(key))
      .sort()
      .map((key) => [key, manifest[key]]),
  ];

  return Object.fromEntries(entries);
}

/** Package manifests describe only published artifacts; workspace source resolution belongs in tooling configuration. */
export function normalizePackageManifest(manifest) {
  const exports = stripSourceCondition(manifest.exports);
  const typesVersions = createTypesVersions(exports, manifest.typesVersions);

  return orderManifest({
    ...manifest,
    ...(manifest.exports && { exports }),
    ...(typesVersions ? { typesVersions } : {}),
  });
}
