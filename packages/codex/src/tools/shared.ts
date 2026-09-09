import type { Catalog } from '../catalog.js';
import type { ToolSchema } from './schema.js';

export interface ToolDefinition<CatalogType extends Catalog = Catalog> {
  description: string;
  execute: (args: Record<string, unknown>, catalog: CatalogType) => unknown;
  inputSchema: ToolSchema;
  name: string;
}
