// Type declaration for packages.mjs — same reasoning as cli.d.mts: vielzeug-packages.ts (a .ts
// file) needs real types for this plain-JS module, which tsc can't infer across the boundary
// on its own.

export interface PackagePeer {
  name: string;
  optional: boolean;
}

export interface PackageManifest {
  dependencies: string[];
  peers: PackagePeer[];
  slug: string;
}

export function readPackageManifests(packagesDir: string): PackageManifest[];
