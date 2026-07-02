/**
 * Generates docs/.vitepress/theme/components/repl/registry.generated.ts — the single
 * source of truth the REPL sidebar, Monaco intellisense, and sandboxed execution engine
 * all read from.
 *
 * Before this script existed, adding a package to the REPL meant hand-authoring three
 * parallel files (`repl/libraries/<name>.ts` with a manually-typed export list,
 * `repl/types/<name>.ts` with a hand-copied `.d.ts` string, and registering both in two
 * index files) that silently drifted from the real package API. Everything below is
 * instead derived from build output that already has to be correct for the package to
 * publish at all:
 *   - `apiExports` / Monaco types <- packages/<name>/dist/index.d.ts (real declarations)
 *   - sandbox IIFE bundle          <- packages/<name>/dist/<name>.iife.js (real build)
 *   - dependency load order       <- packages/<name>/vite.bundle.config.ts `external`
 *
 * Run via `pnpm gen:repl-registry` (wired into docs:dev / docs:build / docs:preview).
 * Requires packages to be built first (`rush build` / `pnpm -r build`) — dist/ must exist.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { listVielzeugPackages, REPL_EXCLUDED_PACKAGES } from './vielzeug-packages';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const OUTPUT_FILE = join(
  ROOT,
  'docs/.vitepress/theme/components/repl/registry.generated.ts',
);

// ---------------------------------------------------------------------------
// Curated metadata that genuinely can't be derived from source: a one-line human
// description per package, and arsenal's fine-grained function categories (every other
// package gets a single implicit "Exports" category — see REPLReference.vue).
// ---------------------------------------------------------------------------

const DESCRIPTIONS: Record<string, string> = {
  arsenal: 'Utility library with functions for arrays, objects, and more.',
  clockwork: 'Typed finite state machines with guards, async invokes, and more.',
  coins: 'Currency formatting and exchange utilities for monetary arithmetic.',
  conduit: 'Lightweight dependency injection container with IoC principles.',
  courier: 'Advanced HTTP client with caching, retries, mutations, and more.',
  dnd: 'Drag-and-drop primitives with file filtering and more.',
  familiar: 'Web Worker pool abstraction with queuing, timeout, and more.',
  flux: 'Composable reactive streams with a full operator library and ecosystem adapters.',
  forge: 'Form state management with reactive fields and async validation.',
  herald: 'Publish/Subscribe event bus with async support.',
  keymap: 'Headless keyboard shortcut manager with chord sequences, context guards, and disposable bindings.',
  ledger: 'Async undo/redo command stack with serialised queueing and Ripple reactive signals.',
  lingua: 'Internationalization library with TypeScript support.',
  orbit: 'Lightweight floating-element positioning for elements.',
  pulse: 'WebSocket client with auto-reconnect, message buffering, and more.',
  ripple: 'Reactive state based on signals, with stores, derived state, and more.',
  rune: 'Structured logger with level filtering, scoped namespaces, and more.',
  sandbox: 'Sandboxed iframe runtime with typed postMessage state bridge.',
  scout: 'Trigram fuzzy-search index with match highlighting and reactive layer.',
  scroll: 'Virtual list engine for performant rendering of large datasets.',
  sourcerer: 'Reactive query sources with pagination and URL state sync.',
  spell: 'Type-safe schema validation with advanced error handling.',
  tempo: 'Timezone-aware date/time library built on Temporal.',
  vault: 'Storage with schemas, TTL, and query building.',
  ward: 'Role-based access control (RBAC) system for permissions.',
  wayfinder: 'Routing library with nested routes and middleware support.',
};

const ARSENAL_CATEGORIES: ReadonlyArray<{ functions: readonly string[]; name: string }> = [
  {
    functions: [
      'chunk', 'compact', 'contains', 'countBy', 'difference', 'drop', 'dropLast', 'filterMap', 'first', 'flatten',
      'groupBy', 'indexBy', 'intersection', 'last', 'partition', 'replace', 'rotate', 'sample', 'search', 'sort',
      'take', 'takeLast', 'toggle', 'union', 'uniq', 'unzip', 'zip',
    ],
    name: 'Array',
  },
  {
    functions: ['abortable', 'attempt', 'defer', 'parallel', 'queue', 'retry', 'sleep', 'timeout', 'waitFor', 'Scheduler', 'polyfillScheduler'],
    name: 'Async',
  },
  {
    functions: [
      'allOf', 'anyOf', 'assert', 'assertAll', 'compare', 'compareBy', 'compose', 'constant', 'curry', 'debounce',
      'identity', 'memo', 'noneOf', 'once', 'partial', 'pipe', 'tap', 'throttle',
    ],
    name: 'Function',
  },
  {
    functions: [
      'abs', 'allocate', 'average', 'clamp', 'gcd', 'lcm', 'lerp', 'linspace', 'max', 'median', 'min', 'mod',
      'normalize', 'percent', 'range', 'round', 'standardDeviation', 'sum', 'variance',
    ],
    name: 'Math',
  },
  { functions: ['currency', 'exchange'], name: 'Money' },
  {
    functions: [
      'deepClone', 'deepMerge', 'defaults', 'diff', 'entries', 'filterValues', 'fromEntries', 'get', 'has', 'invert',
      'keys', 'mapKeys', 'mapValues', 'omit', 'parseJSON', 'pick', 'prune', 'shallowMerge', 'stash', 'values',
    ],
    name: 'Object',
  },
  { functions: ['draw', 'random', 'shuffle', 'uuid'], name: 'Random' },
  {
    functions: [
      'camelCase', 'endsWith', 'escape', 'kebabCase', 'pad', 'pascalCase', 'similarity', 'snakeCase', 'startsWith',
      'titleCase', 'truncate', 'unescape', 'words',
    ],
    name: 'String',
  },
  {
    functions: [
      'is', 'isArray', 'isBoolean', 'isDate', 'isDefined', 'isEmpty', 'isEqual', 'isFunction', 'isGreaterThan',
      'isGreaterThanOrEqual', 'isLessThan', 'isLessThanOrEqual', 'isMatch', 'isNil', 'isNumber', 'isObject',
      'isPrimitive', 'isPromise', 'isRegex', 'isString', 'isWithin', 'typeOf',
    ],
    name: 'Typed',
  },
];

// ---------------------------------------------------------------------------
// Global variable name + dependency order, parsed from each package's vite.bundle.config.ts
// ---------------------------------------------------------------------------

interface BundleMeta {
  externalDeps: string[];
  fileName: string;
  globalName: string;
}

// Reads the object literal passed as the second argument to getBundleConfig(__dirname, {...})
// via the real AST rather than regexing the file text — every package's vite.bundle.config.ts
// already goes through the same call shape (see root vite.config.ts's getBundleConfig), so
// this only needs to find one call expression and pull three properties off its object
// argument. That's more robust to reformatting than pattern-matching the source text, and
// keeps this generator's two source-reading paths (this one, extractApi() below) both using
// the compiler API instead of one being regex and one being real AST.
function findGetBundleConfigCall(node: ts.Node): ts.CallExpression | undefined {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'getBundleConfig') {
    return node;
  }

  return ts.forEachChild(node, findGetBundleConfigCall);
}

function readStringProperty(obj: ts.ObjectLiteralExpression, name: string): string | undefined {
  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === name) {
      return ts.isStringLiteralLike(prop.initializer) ? prop.initializer.text : undefined;
    }
  }

  return undefined;
}

function readExternalDeps(obj: ts.ObjectLiteralExpression): string[] {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name) || prop.name.text !== 'external') continue;
    if (!ts.isArrayLiteralExpression(prop.initializer)) return [];

    return prop.initializer.elements
      .filter(ts.isStringLiteralLike)
      .map((el) => el.text)
      .filter((specifier) => specifier.startsWith('@vielzeug/'))
      .map((specifier) => specifier.slice('@vielzeug/'.length));
  }

  return [];
}

function readBundleMeta(pkg: string): BundleMeta {
  const configPath = join(PACKAGES_DIR, pkg, 'vite.bundle.config.ts');
  const source = readFileSync(configPath, 'utf8');
  const sourceFile = ts.createSourceFile(configPath, source, ts.ScriptTarget.Latest, true);

  const call = findGetBundleConfigCall(sourceFile);
  const options = call?.arguments[1];

  if (!options || !ts.isObjectLiteralExpression(options)) {
    throw new Error(`Could not find a getBundleConfig(__dirname, { ... }) call in ${configPath}`);
  }

  const fileName = readStringProperty(options, 'fileName');
  const globalName = readStringProperty(options, 'name');

  if (!fileName || !globalName) {
    throw new Error(`getBundleConfig(...) in ${configPath} is missing a string "fileName" or "name" property.`);
  }

  return { externalDeps: readExternalDeps(options), fileName, globalName };
}

/** Depth-first, dependencies-before-dependents. `visiting` catches accidental cycles. */
function resolveLoadOrder(pkg: string, metaByPkg: Map<string, BundleMeta>, visiting = new Set<string>()): string[] {
  if (visiting.has(pkg)) throw new Error(`Circular @vielzeug dependency detected involving "${pkg}"`);
  visiting.add(pkg);

  const meta = metaByPkg.get(pkg);
  const order: string[] = [];
  const seen = new Set<string>();

  for (const dep of meta?.externalDeps ?? []) {
    for (const transitive of resolveLoadOrder(dep, metaByPkg, visiting)) {
      if (!seen.has(transitive)) {
        seen.add(transitive);
        order.push(transitive);
      }
    }
  }

  visiting.delete(pkg);
  order.push(pkg);

  return order;
}

// ---------------------------------------------------------------------------
// apiExports + Monaco types, derived from the package's built declaration file.
// Rooting the TS program at dist/index.d.ts (not src/index.ts) means every printed
// declaration is already ambient-safe (no function/class bodies to strip) and every
// `export * from './relative/chunk'` re-export chain is resolved by the compiler itself.
// ---------------------------------------------------------------------------

interface ExtractedApi {
  typeDeclaration: string;
  valueExports: string[];
}

const VALUE_FLAGS =
  ts.SymbolFlags.Value | ts.SymbolFlags.Function | ts.SymbolFlags.Class | ts.SymbolFlags.Enum | ts.SymbolFlags.ValueModule;

// A symbol's `getDeclarations()` for a `const foo = () => ...` export returns the inner
// `VariableDeclaration` node ("foo: () => void") — the `export`/`declare` modifiers live
// on its grandparent `VariableStatement`. Printing the declarator alone silently drops
// them, producing invalid ambient syntax ("foo: () => void" with no keyword at all).
function toPrintableNode(decl: ts.Node): ts.Node {
  if (ts.isVariableDeclaration(decl) && ts.isVariableStatement(decl.parent.parent)) {
    return decl.parent.parent;
  }

  return decl;
}

// Printing a node includes its leading JSDoc as plain text ahead of the declaration
// keywords, so a naive "does this start with 'export'" check on the whole string sees the
// comment instead and wrongly prepends a second `export`. Check only the code portion.
function normalizeAmbientText(printed: string): string {
  const match = /^(\s*\/\*\*[\s\S]*?\*\/\s*)?([\s\S]*)$/.exec(printed);
  const [, comment = '', code = printed] = match ?? [];

  const withoutDeclare = code.replace(/^export\s+declare\s+/, 'export ').replace(/^declare\s+/, 'export ');
  const exported = /^export\s/.test(withoutDeclare) ? withoutDeclare : `export ${withoutDeclare}`;

  return `${comment}${exported}`;
}

// The generator's whole premise is "read real build output" — a missing dist/ almost always
// means "forgot to build the package," not a bug in this script. A raw ENOENT stack trace
// doesn't say that; this does.
function readDistFile(pkg: string, relativePath: string): string {
  const path = join(PACKAGES_DIR, pkg, 'dist', relativePath);

  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. Run "pnpm --filter @vielzeug/${pkg} build" first.`);
  }

  return readFileSync(path, 'utf8');
}

function extractApi(pkg: string): ExtractedApi {
  const entry = join(PACKAGES_DIR, pkg, 'dist/index.d.ts');

  readDistFile(pkg, 'index.d.ts'); // fail fast with a clear message before handing this to the compiler

  const program = ts.createProgram([entry], {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(entry);

  if (!sourceFile) throw new Error(`Could not load ${entry} as a TS program root`);

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

  if (!moduleSymbol) throw new Error(`${entry} has no resolvable module symbol (is it a valid ES module?)`);

  const printer = ts.createPrinter({ removeComments: false });
  const printedByNode = new Map<ts.Node, string>();
  const valueExports: string[] = [];

  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const resolved = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;

    if (resolved.flags & VALUE_FLAGS) valueExports.push(exported.getName());

    for (const rawDecl of resolved.getDeclarations() ?? []) {
      const decl = toPrintableNode(rawDecl);
      if (printedByNode.has(decl)) continue;
      const printed = printer.printNode(ts.EmitHint.Unspecified, decl, decl.getSourceFile());
      printedByNode.set(decl, normalizeAmbientText(printed));
    }
  }

  const body = [...printedByNode.values()].sort().join('\n\n');
  const typeDeclaration = `declare module '@vielzeug/${pkg}' {\n${body}\n}`;

  return { typeDeclaration, valueExports: valueExports.sort() };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function quote(value: string): string {
  return JSON.stringify(value);
}

function main(): void {
  const packages = listVielzeugPackages(PACKAGES_DIR).filter((pkg) => !REPL_EXCLUDED_PACKAGES.has(pkg));
  const metaByPkg = new Map(packages.map((pkg) => [pkg, readBundleMeta(pkg)]));

  const entries = packages.map((pkg) => {
    const meta = metaByPkg.get(pkg)!;
    const { typeDeclaration, valueExports } = extractApi(pkg);
    const loadOrder = resolveLoadOrder(pkg, metaByPkg);
    const dependencies = loadOrder.filter((name) => name !== pkg);
    const iifeSource = readDistFile(pkg, `${meta.fileName}.iife.js`);

    const categories =
      pkg === 'arsenal'
        ? ARSENAL_CATEGORIES
        : [{ functions: valueExports, name: 'Exports' }];

    return { categories, dependencies, description: DESCRIPTIONS[pkg] ?? '', exports: valueExports, globalName: meta.globalName, iifeSource, id: pkg, typeDeclaration };
  });

  // Every dependency resolveLoadOrder() found has to actually be one of the packages this
  // registry generated an entry for — REPLEditor.vue looks dependencies up in the finished
  // registry with a non-null assertion, trusting this file to be internally consistent. Catch
  // a package that externalizes something excluded/missing here, at generation time, instead
  // of as a runtime crash the next time someone picks that library in the REPL.
  const registeredIds = new Set(packages);

  for (const entry of entries) {
    for (const dep of entry.dependencies) {
      if (!registeredIds.has(dep)) {
        throw new Error(
          `"${entry.id}" depends on "${dep}", which has no REPL registry entry (excluded or missing). ` +
            `Every @vielzeug/* dependency of a REPL-registered package must itself be REPL-registered.`,
        );
      }
    }
  }

  const body = entries
    .map(
      (entry) => `  ${quote(entry.id)}: {
    id: ${quote(entry.id)},
    description: ${quote(entry.description)},
    globalName: ${quote(entry.globalName)},
    dependencies: ${JSON.stringify(entry.dependencies)},
    exports: ${JSON.stringify(entry.exports)},
    categories: ${JSON.stringify(entry.categories)},
    typeDeclaration: ${quote(entry.typeDeclaration)},
    iifeSource: ${quote(entry.iifeSource)},
  },`,
    )
    .join('\n');

  const output = `// AUTO-GENERATED by scripts/generate-repl-registry.ts — do not edit by hand.
// Run \`pnpm gen:repl-registry\` to regenerate (also runs automatically before docs:dev /
// docs:build / docs:preview). Source of truth: each package's dist/index.d.ts,
// dist/<name>.iife.js, and vite.bundle.config.ts — see the header comment in the
// generator script for why.

export interface LibraryCategory {
  functions: string[];
  name: string;
}

export interface LibraryEntry {
  id: string;
  categories: LibraryCategory[];
  dependencies: string[];
  description: string;
  exports: string[];
  globalName: string;
  iifeSource: string;
  typeDeclaration: string;
}

export const LIBRARY_REGISTRY: Record<string, LibraryEntry> = {
${body}
};
`;

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(OUTPUT_FILE, output, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Generated REPL registry for ${packages.length} packages -> ${OUTPUT_FILE}`);
}

main();
