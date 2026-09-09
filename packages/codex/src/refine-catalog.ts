import { type Catalog, CatalogError, SnapshotCatalog } from './catalog.js';
import type { LoadedSnapshot } from './snapshot.js';
import type { CemDeclaration } from './types.js';

export interface RefineCatalog extends Catalog {
  getComponent(tagName: string): CemDeclaration;
  listComponents(): CemDeclaration[];
}

export class SnapshotRefineCatalog extends SnapshotCatalog implements RefineCatalog {
  private readonly components: CemDeclaration[];
  private readonly componentsByTag: Map<string, CemDeclaration>;

  constructor(snapshot: LoadedSnapshot) {
    super(snapshot);
    this.components = snapshot.refineComponents;
    this.componentsByTag = new Map(
      this.components.flatMap((component) => (component.tagName ? [[component.tagName, component] as const] : [])),
    );
  }

  listComponents(): CemDeclaration[] {
    if (this.components.length === 0) {
      throw new CatalogError('UNAVAILABLE', 'Refine component metadata is unavailable in this snapshot.');
    }

    return [...this.components];
  }

  getComponent(tagName: string): CemDeclaration {
    this.listComponents();
    const component = this.componentsByTag.get(tagName);

    if (!component) throw new CatalogError('NOT_FOUND', `Component "${tagName}" not found.`);
    return component;
  }
}
