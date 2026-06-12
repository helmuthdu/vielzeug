/**
 * Ambient TypeScript declarations for @vielzeug/sigil CSS subpath imports.
 *
 * Without these declarations, TypeScript in strict mode raises
 * "Cannot find module '@vielzeug/sigil/styles'" errors when CSS subpaths
 * are imported directly (e.g. in Vite, Astro, or Next.js projects).
 */

declare module '@vielzeug/sigil/styles' {
  const styles: string;

  export default styles;
}

declare module '@vielzeug/sigil/styles/styles.css' {
  const styles: string;

  export default styles;
}

declare module '@vielzeug/sigil/styles/theme.css' {
  const styles: string;

  export default styles;
}

declare module '@vielzeug/sigil/styles/animation.css' {
  const styles: string;

  export default styles;
}

declare module '@vielzeug/sigil/styles/layers.css' {
  const styles: string;

  export default styles;
}

declare module '@vielzeug/sigil/styles/preflight.css' {
  const styles: string;

  export default styles;
}
