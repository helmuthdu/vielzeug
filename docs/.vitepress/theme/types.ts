import type { DefaultTheme } from 'vitepress';

export interface PackageInfo {
  dependencies: number;
  minNode: string | null;
  size: string;
  version: string;
}

export interface ThemeConfig extends DefaultTheme.Config {
  packages?: Record<string, PackageInfo>;
}
