export const dependencyFields = ['dependencies', 'optionalDependencies', 'peerDependencies'];

const workspacePrefix = '@vielzeug/';

export function packageSpecifier(name, subpath) {
  return subpath === '.' ? name : `${name}/${subpath.slice(2)}`;
}

export function internalDependencies(manifest) {
  return dependencyFields.flatMap((field) => Object.keys(manifest[field] ?? {}).filter((name) => name.startsWith(workspacePrefix)));
}

export function collectPackageClosure(targets, projects, readPackage) {
  const folders = new Map();
  const visit = (name) => {
    if (folders.has(name)) return;

    const folder = projects.get(name);
    if (!folder) throw new Error(`Unknown workspace package: ${name}`);

    const manifest = readPackage(folder);
    folders.set(name, { folder, manifest });
    internalDependencies(manifest).forEach(visit);
  };

  targets.forEach(visit);
  return folders;
}

export function hasSourceCondition(value) {
  if (Array.isArray(value)) return value.some(hasSourceCondition);
  if (typeof value !== 'object' || value === null) return false;

  return Object.entries(value).some(([key, child]) => key === 'source' || hasSourceCondition(child));
}

export function exportEntries(manifest) {
  if (typeof manifest.exports === 'string') return [{ import: manifest.exports, specifier: manifest.name }];
  if (typeof manifest.exports !== 'object' || manifest.exports === null) return [];

  return Object.entries(manifest.exports).flatMap(([subpath, value]) => {
    if (typeof value === 'string') return [{ import: value, specifier: packageSpecifier(manifest.name, subpath) }];
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];

    return [{ import: value.import ?? value.default, require: value.require, specifier: packageSpecifier(manifest.name, subpath), types: value.types }];
  });
}

export function targetPaths(value) {
  if (typeof value === 'string') return value.startsWith('./') ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(targetPaths);
  if (typeof value !== 'object' || value === null) return [];

  return Object.values(value).flatMap(targetPaths);
}
