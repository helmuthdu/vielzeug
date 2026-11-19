import type { Catalog } from '../catalog.js';
import type { ToolSchema } from './schema.js';

export interface ToolDefinition {
  description: string;
  execute: (args: Record<string, unknown>, catalog: Catalog) => unknown;
  inputSchema: ToolSchema;
  name: string;
}
