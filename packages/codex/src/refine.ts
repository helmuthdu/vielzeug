/**
 * `@vielzeug/codex/refine` — opt-in Refine component tools.
 *
 * The main entry (`@vielzeug/codex`) registers only generic, product-agnostic package
 * tools. Refine-specific tools (`refine-*`) live here behind a subpath so the core
 * documentation server stays reusable without Refine. Call `registerRefineTools()` on
 * a server created by `createMcpServer()` to upgrade it to the full Refine-augmented
 * tool surface.
 */
export { type RefineCatalog, SnapshotRefineCatalog } from './refine-catalog.js';
export { refineTools, registerRefineTools } from './tools/refine.js';
export type {
  CemAttribute,
  CemCssPart,
  CemCssProperty,
  CemDeclaration,
  CemEvent,
  CemMember,
  CemSlot,
} from './types.js';
