/**
 * Ambient TypeScript declarations for @vielzeug/refine CSS subpath imports.
 *
 * Without these declarations, TypeScript in strict mode raises
 * "Cannot find module '@vielzeug/refine/styles'" errors when CSS subpaths
 * are imported directly (e.g. in Vite, Astro, or Next.js projects).
 */

declare module '@vielzeug/refine/styles' {
  const styles: string;

  export default styles;
}

declare module '@vielzeug/refine/styles/styles.css' {
  const styles: string;

  export default styles;
}

declare module '@vielzeug/refine/styles/theme.css' {
  const styles: string;

  export default styles;
}

declare module '@vielzeug/refine/styles/animation.css' {
  const styles: string;

  export default styles;
}

declare module '@vielzeug/refine/styles/layers.css' {
  const styles: string;

  export default styles;
}

declare module '@vielzeug/refine/styles/preflight.css' {
  const styles: string;

  export default styles;
}
