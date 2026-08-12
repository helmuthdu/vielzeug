export type PackageGroup = {
  icon: string;
  id: string;
  name: string;
  packages: Array<{ id: string; tagline: string }>;
};

export const PACKAGE_GROUPS: PackageGroup[] = [
  {
    icon: 'atom',
    id: 'core',
    name: 'Core Primitives',
    packages: [
      { id: 'clockwork', tagline: 'Finite state machines' },
      { id: 'flux', tagline: 'Reactive streams & operators' },
      { id: 'ripple', tagline: 'Signals, computed, effects' },
    ],
  },
  {
    icon: 'database',
    id: 'data',
    name: 'Data Layer',
    packages: [
      { id: 'courier', tagline: 'HTTP client & caching' },
      { id: 'pulse', tagline: 'WebSocket client & presence' },
      { id: 'sourcerer', tagline: 'Reactive data sources' },
      { id: 'vault', tagline: 'Browser storage' },
    ],
  },
  {
    icon: 'layout',
    id: 'ui',
    name: 'UI Components',
    packages: [
      { id: 'ore', tagline: 'Web component primitives' },
      { id: 'dnd', tagline: 'Drag & drop' },
      { id: 'necromancer', tagline: 'Web Animations API primitives' },
      { id: 'orbit', tagline: 'Floating positioning' },
      { id: 'prism', tagline: 'SVG charts' },
      { id: 'scroll', tagline: 'Virtual lists' },
      { id: 'refine', tagline: 'Accessible components' },
    ],
  },
  {
    icon: 'check-square',
    id: 'forms',
    name: 'Forms & Validation',
    packages: [
      { id: 'forge', tagline: 'Form state & validation' },
      { id: 'spell', tagline: 'Schema validation' },
    ],
  },
  {
    icon: 'building-2',
    id: 'infrastructure',
    name: 'App Infrastructure',
    packages: [
      { id: 'conduit', tagline: 'Dependency injection' },
      { id: 'familiar', tagline: 'Web Worker pool' },
      { id: 'herald', tagline: 'Typed event bus' },
      { id: 'keymap', tagline: 'Keyboard shortcuts & chords' },
      { id: 'ward', tagline: 'RBAC & permissions' },
      { id: 'wayfinder', tagline: 'Client-side routing' },
    ],
  },
  {
    icon: 'wrench',
    id: 'utilities',
    name: 'Utilities & Tools',
    packages: [
      { id: 'arsenal', tagline: '75+ utility functions' },
      { id: 'assay', tagline: 'DOM testing primitives' },
      { id: 'codex', tagline: 'AI / MCP server' },
      { id: 'coins', tagline: 'Monetary arithmetic' },
      { id: 'ledger', tagline: 'Async undo / redo history' },
      { id: 'lingua', tagline: 'i18n & pluralization' },
      { id: 'rune', tagline: 'Structured logging' },
      { id: 'sandbox', tagline: 'Sandboxed iframe runtime' },
      { id: 'scout', tagline: 'Trigram fuzzy search' },
      { id: 'tempo', tagline: 'Date & time' },
    ],
  },
];
