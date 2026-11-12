export type PackageGroup = {
  icon: string;
  id: string;
  name: string;
  packages: Array<{ id: string; tagline: string }>;
};

export const PACKAGE_GROUPS: PackageGroup[] = [
  {
    icon: 'atom',
    id: 'foundations',
    name: 'Foundations',
    packages: [
      { id: 'arsenal', tagline: '75+ utility functions' },
      { id: 'clockwork', tagline: 'Finite state machines' },
      { id: 'flux', tagline: 'Reactive streams & operators' },
      { id: 'herald', tagline: 'Typed event bus' },
      { id: 'ripple', tagline: 'Signals, computed, effects' },
      { id: 'sentinel', tagline: 'Reactive environment state' },
    ],
  },
  {
    icon: 'database',
    id: 'data',
    name: 'Data & Formats',
    packages: [
      { id: 'archive', tagline: 'Community archive core' },
      { id: 'patchwork', tagline: 'RFC 6902 JSON Patch' },
      { id: 'scout', tagline: 'Trigram fuzzy search' },
      { id: 'tabula', tagline: 'Typed CSV & TSV' },
      { id: 'vault', tagline: 'Browser storage' },
    ],
  },
  {
    icon: 'network',
    id: 'connectivity',
    name: 'Network & Sync',
    packages: [
      { id: 'courier', tagline: 'HTTP client & caching' },
      { id: 'mesh', tagline: 'Backendless P2P sessions' },
      { id: 'postmaster', tagline: 'Durable job outbox' },
      { id: 'pulse', tagline: 'WebSocket client & presence' },
      { id: 'sourcerer', tagline: 'Reactive data sources' },
      { id: 'tandem', tagline: 'Offline-first sync engine' },
      { id: 'tavern', tagline: 'Table session replication over mesh' },
    ],
  },
  {
    icon: 'building-2',
    id: 'runtime',
    name: 'Runtime & Architecture',
    packages: [
      { id: 'conduit', tagline: 'Dependency injection' },
      { id: 'familiar', tagline: 'Web Worker pool' },
      { id: 'ledger', tagline: 'Async undo / redo history' },
      { id: 'sandbox', tagline: 'Sandboxed iframe runtime' },
      { id: 'wayfinder', tagline: 'Client-side routing' },
      { id: 'ward', tagline: 'RBAC & permissions' },
    ],
  },
  {
    icon: 'check-square',
    id: 'domain',
    name: 'Forms & Domain Logic',
    packages: [
      { id: 'coins', tagline: 'Monetary arithmetic' },
      { id: 'forge', tagline: 'Form state & validation' },
      { id: 'lingua', tagline: 'i18n & pluralization' },
      { id: 'spell', tagline: 'Schema validation' },
      { id: 'tempo', tagline: 'Date & time' },
    ],
  },
  {
    icon: 'layout-grid',
    id: 'ui',
    name: 'UI Components',
    packages: [
      { id: 'beacon', tagline: 'Product tours & onboarding' },
      { id: 'necromancer', tagline: 'Web Animations API primitives' },
      { id: 'ore', tagline: 'Web component primitives' },
      { id: 'prism', tagline: 'SVG charts' },
      { id: 'refine', tagline: 'Accessible components' },
      { id: 'scribe', tagline: 'Safe Markdown prose' },
      { id: 'sigil', tagline: 'QR generation & scanning' },
    ],
  },
  {
    icon: 'mouse-pointer-click',
    id: 'interaction',
    name: 'Interaction',
    packages: [
      { id: 'dnd', tagline: 'Drag & drop' },
      { id: 'focus', tagline: 'Keyboard nav & focus restoration' },
      { id: 'gesture', tagline: 'Swipe gesture recognition' },
      { id: 'keymap', tagline: 'Keyboard shortcuts & chords' },
      { id: 'orbit', tagline: 'Floating positioning' },
      { id: 'scroll', tagline: 'Virtual lists' },
    ],
  },
  {
    icon: 'wrench',
    id: 'devtools',
    name: 'Developer Tools',
    packages: [
      { id: 'assay', tagline: 'DOM testing primitives' },
      { id: 'codex', tagline: 'AI / MCP server' },
      { id: 'illusionist', tagline: 'Fake data generator' },
      { id: 'rune', tagline: 'Structured logging' },
    ],
  },
];

const packageGroupsById = new Map(PACKAGE_GROUPS.map((group) => [group.id, group] as const));

const requirePackageGroup = (id: string): PackageGroup => {
  const group = packageGroupsById.get(id);
  if (!group) {
    throw new Error(`Unknown package group: ${id}`);
  }
  return group;
};

// Explicit navbar column layout: keeps each column balanced as packages are added.
// Columns render left-to-right; the menu's CSS grid places them in order.
export const NAVBAR_COLUMNS: PackageGroup[][] = [
  [requirePackageGroup('foundations'), requirePackageGroup('data')], // Foundations · Data & Formats
  [requirePackageGroup('connectivity'), requirePackageGroup('domain')], // Network & Sync · Forms & Domain Logic
  [requirePackageGroup('runtime'), requirePackageGroup('interaction')], // Runtime & Architecture · Interaction
  [requirePackageGroup('ui'), requirePackageGroup('devtools')], // UI Components · Developer Tools
];
