export const DESCRIPTIONS: Record<string, string> = {
  arsenal: 'Tree-shakeable utilities with focused category entry points.',
  assay: 'Framework-agnostic DOM testing primitives — scoped queries, event dispatch, and async waiting.',
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
  refine: 'Accessible, themeable web components built on Ore.',
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

export interface ReplCategory {
  functions: readonly string[];
  name: string;
}

export const ARSENAL_CATEGORIES: readonly ReplCategory[] = [
  {
    functions: ['chunk', 'compact', 'compare', 'compareBy', 'contains', 'countBy', 'difference', 'drop', 'dropLast', 'filterMap', 'first', 'flatten', 'fuzzyFilter', 'fuzzyScore', 'groupBy', 'indexBy', 'intersection', 'last', 'partition', 'replace', 'rotate', 'sort', 'take', 'takeLast', 'toggle', 'union', 'uniq', 'unzip', 'zip'],
    name: 'Array',
  },
  {
    functions: ['abortError', 'attempt', 'backoff', 'parallel', 'retry', 'sleep', 'taskPool', 'waitFor'],
    name: 'Async',
  },
  { functions: ['cache', 'memo'], name: 'Cache' },
  {
    functions: ['assert', 'debounce', 'once', 'pipe', 'runAll', 'tap', 'throttle'],
    name: 'Function',
  },
  {
    functions: ['allOf', 'anyOf', 'isAbortError', 'isDate', 'isDefined', 'isEmpty', 'isEqual', 'isError', 'isFunction', 'isMatch', 'isNil', 'isNumber', 'isPlainObject', 'isPrimitive', 'isPromise', 'isRegex', 'noneOf', 'shallowEqual'],
    name: 'Guards',
  },
  {
    functions: ['allocate', 'average', 'clamp', 'gcd', 'lcm', 'lerp', 'linspace', 'median', 'mod', 'normalize', 'percent', 'range', 'round', 'standardDeviation', 'sum', 'variance'],
    name: 'Math',
  },
  {
    functions: ['deepMerge', 'defaults', 'diff', 'filterValues', 'flattenPaths', 'getPath', 'getPathOr', 'hash', 'invert', 'mapKeys', 'mapValues', 'omit', 'pick', 'prune', 'requirePath', 'shallowMerge', 'tryParseJson'],
    name: 'Object',
  },
  { functions: ['draw', 'drawMany', 'random', 'shuffle', 'uuid'], name: 'Random' },
  {
    functions: ['camelCase', 'escape', 'kebabCase', 'pad', 'pascalCase', 'similarity', 'snakeCase', 'titleCase', 'truncate', 'unescape', 'words'],
    name: 'String',
  },
];
