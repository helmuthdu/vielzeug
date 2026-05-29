export const DOC_PAGES = ['index', 'api', 'usage', 'examples'] as const;
export type DocPage = (typeof DOC_PAGES)[number];

export interface CemDeclaration {
  [key: string]: unknown;
  name?: string;
  tagName?: string;
}

export interface BundledPackage {
  apiSource: string | null;
  availableDocPages: DocPage[];
  category: string;
  components: CemDeclaration[];
  description: string;
  docs: Partial<Record<DocPage, string>>;
  exports: string[];
  keywords: string[];
  name: string;
  related: string[];
  slug: string;
  version: string | null;
}

export interface BundledData {
  mcpitVersion: string;
  packages: BundledPackage[];
}

export type PackageMeta = Omit<BundledPackage, 'apiSource' | 'components' | 'docs'> & {
  hasSource: boolean;
};
