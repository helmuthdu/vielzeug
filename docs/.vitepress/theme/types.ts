import type { DefaultTheme } from 'vitepress';

export interface PackageInfo {
  version: string;
  dependencies: number;
  size: string;
}

export interface ThemeConfig extends DefaultTheme.Config {
  packages?: Record<string, PackageInfo>;
}
