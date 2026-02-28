/**
 * Server-Side Rendering (SSR) and Static Site Generation (SSG) utilities
 * Provides support for Declarative Shadow DOM and component hydration
 *
 * @module buildit/ssr
 */

/**
 * SSR Configuration
 */
export interface SSRConfig {
  /** Enable Declarative Shadow DOM */
  declarativeShadowDOM?: boolean;
  /** Include component styles inline */
  inlineStyles?: boolean;
  /** Defer script loading */
  deferScripts?: boolean;
  /** Hydration strategy: 'immediate' | 'idle' | 'visible' | 'media-query' */
  hydration?: 'immediate' | 'idle' | 'visible' | 'media-query';
  /** Media query for conditional hydration */
  mediaQuery?: string;
}

/**
 * Generate Declarative Shadow DOM template for a component
 * This enables server-side rendering with shadow DOM content
 *
 * @param tagName - Custom element tag name
 * @param content - Shadow DOM content (HTML string)
 * @param styles - Component styles (CSS string)
 * @param attributes - Component attributes
 * @returns HTML string with Declarative Shadow DOM
 *
 * @example
 * const html = generateDeclarativeShadowDOM(
 *   'bit-button',
 *   '<slot></slot>',
 *   ':host { display: inline-block; }',
 *   { variant: 'outline', color: 'primary' }
 * );
 */
export function generateDeclarativeShadowDOM(
  tagName: string,
  content: string,
  styles: string,
  attributes: Record<string, string | boolean> = {},
): string {
  const attrs = Object.entries(attributes)
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return value ? key : '';
      }
      return `${key}="${escapeHtml(String(value))}"`;
    })
    .filter(Boolean)
    .join(' ');

  return `<${tagName}${attrs ? ` ${attrs}` : ''}>
  <template shadowrootmode="open">
    ${styles ? `<style>${styles}</style>` : ''}
    ${content}
  </template>
</${tagName}>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "'": '&#39;',
    '"': '&quot;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };

  return str.replace(/["'&<>]/g, (char) => map[char]);
}

/**
 * Server-side render a component with Declarative Shadow DOM
 *
 * @example
 * const html = renderToString('bit-button', {
 *   attributes: { variant: 'outline', color: 'primary' },
 *   children: 'Click me',
 *   styles: buttonStyles
 * });
 */
export function renderToString(
  tagName: string,
  options: {
    attributes?: Record<string, string | boolean>;
    children?: string;
    styles?: string;
    shadowContent?: string;
  } = {},
): string {
  const { attributes = {}, children = '', styles = '', shadowContent } = options;

  const content = shadowContent || '<slot></slot>';

  const component = generateDeclarativeShadowDOM(tagName, content, styles, attributes);

  // If there are light DOM children, add them
  if (children) {
    return component.replace(`</${tagName}>`, `${children}</${tagName}>`);
  }

  return component;
}

/**
 * Generate hydration script for client-side hydration
 * Attaches hydration logic based on strategy
 *
 * @param config - SSR configuration
 * @returns Script tag HTML
 *
 * @example
 * const script = generateHydrationScript({
 *   hydration: 'idle',
 *   deferScripts: true
 * });
 */
export function generateHydrationScript(config: SSRConfig = {}): string {
  const { hydration = 'immediate', deferScripts = true, mediaQuery } = config;

  let hydrationCode = '';

  switch (hydration) {
    case 'idle':
      hydrationCode = `
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            hydrateComponents();
          });
        } else {
          setTimeout(hydrateComponents, 1);
        }
      `;
      break;

    case 'visible':
      hydrationCode = `
        if ('IntersectionObserver' in window) {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                hydrateComponents();
                observer.disconnect();
              }
            });
          });

          document.querySelectorAll('[data-hydrate]').forEach(el => {
            observer.observe(el);
          });
        } else {
          hydrateComponents();
        }
      `;
      break;

    case 'media-query':
      if (!mediaQuery) {
        throw new Error('mediaQuery option required for media-query hydration strategy');
      }
      hydrationCode = `
        const mediaQueryList = window.matchMedia('${mediaQuery}');

        if (mediaQueryList.matches) {
          hydrateComponents();
        } else {
          mediaQueryList.addEventListener('change', (e) => {
            if (e.matches) {
              hydrateComponents();
            }
          });
        }
      `;
      break;
    default:
      hydrationCode = 'hydrateComponents();';
      break;
  }

  const script = `
    <script${deferScripts ? ' defer' : ''}>
      function hydrateComponents() {
        // Trigger custom element upgrades if needed
        if (window.customElements && window.customElements.upgrade) {
          document.querySelectorAll('[data-hydrate]').forEach(el => {
            window.customElements.upgrade(el);
          });
        }

        // Dispatch hydrated event
        document.dispatchEvent(new CustomEvent('components-hydrated'));
      }

      ${hydrationCode}
    </script>
  `;

  return script;
}

/**
 * Mark component for hydration
 * Adds data-hydrate attribute for hydration tracking
 *
 * @param html - Component HTML
 * @returns HTML with hydration marker
 */
export function markForHydration(html: string): string {
  return html.replace(/^<([a-z][a-z0-9-]*)/, '<$1 data-hydrate');
}

/**
 * Generate complete SSR page with components
 *
 * @param components - Array of component HTML strings
 * @param config - SSR configuration
 * @returns Complete HTML page
 *
 * @example
 * const page = generateSSRPage([
 *   renderToString('bit-button', { children: 'Click me' }),
 *   renderToString('bit-card', { children: 'Card content' })
 * ], {
 *   hydration: 'idle',
 *   inlineStyles: true
 * });
 */
export function generateSSRPage(components: string[], config: SSRConfig = {}): string {
  const { declarativeShadowDOM = true } = config;

  const componentsHtml = components.map((c) => markForHydration(c)).join('\n');

  const hydrationScript = declarativeShadowDOM ? generateHydrationScript(config) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSR Page</title>
  ${config.inlineStyles ? '<link rel="stylesheet" href="/styles.css">' : ''}
</head>
<body>
  ${componentsHtml}
  ${hydrationScript}
  <script type="module" src="/components.js"></script>
</body>
</html>`;
}

/**
 * Framework-specific SSR helpers
 */

/**
 * Next.js SSR helper
 * Renders buildit component in Next.js page
 *
 * @example
 * // In pages/index.tsx
 * export async function getServerSideProps() {
 *   const buttonHtml = nextSSR('bit-button', {
 *     attributes: { variant: 'outline' },
 *     children: 'Server rendered button'
 *   });
 *
 *   return { props: { buttonHtml } };
 * }
 */
export function nextSSR(
  tagName: string,
  options: {
    attributes?: Record<string, string | boolean>;
    children?: string;
  } = {},
): string {
  return renderToString(tagName, options);
}

/**
 * Astro SSR helper
 * Component for use in Astro .astro files
 *
 * @example
 * ---
 * import { astroSSR } from '@vielzeug/buildit/ssr';
 * const button = astroSSR('bit-button', {
 *   attributes: { variant: 'outline', color: 'primary' },
 *   children: 'Click me'
 * });
 * ---
 * <div set:html={button} />
 */
export function astroSSR(
  tagName: string,
  options: {
    attributes?: Record<string, string | boolean>;
    children?: string;
  } = {},
): string {
  return renderToString(tagName, options);
}

/**
 * SvelteKit SSR helper
 * Renders component for SvelteKit load function
 *
 * @example
 * // In +page.server.ts
 * export async function load() {
 *   const buttonHtml = svelteKitSSR('bit-button', {
 *     attributes: { variant: 'outline' },
 *     children: 'Server rendered'
 *   });
 *
 *   return { buttonHtml };
 * }
 *
 * // In +page.svelte
 * <script>
 *   export let buttonHtml;
 * </script>
 * {@html buttonHtml}
 */
export function svelteKitSSR(
  tagName: string,
  options: {
    attributes?: Record<string, string | boolean>;
    children?: string;
  } = {},
): string {
  return renderToString(tagName, options);
}

/**
 * Remix SSR helper
 * Renders component for Remix loader
 *
 * @example
 * // In routes/index.tsx
 * export async function loader() {
 *   const buttonHtml = remixSSR('bit-button', {
 *     attributes: { variant: 'outline' },
 *     children: 'Server rendered'
 *   });
 *
 *   return json({ buttonHtml });
 * }
 */
export function remixSSR(
  tagName: string,
  options: {
    attributes?: Record<string, string | boolean>;
    children?: string;
  } = {},
): string {
  return renderToString(tagName, options);
}

/**
 * Collect component styles for SSR
 * Extracts styles from component modules for inline CSS
 *
 * @param componentNames - Array of component tag names
 * @returns Combined CSS string
 *
 * @example
 * const styles = await collectComponentStyles([
 *   'bit-button',
 *   'bit-card',
 *   'bit-input'
 * ]);
 */
export async function collectComponentStyles(_componentNames: string[]): Promise<string> {
  // This would need actual component module imports
  // For now, return placeholder
  console.warn('collectComponentStyles needs component module access');
  return '/* Component styles would be collected here */';
}

/**
 * Preload critical components
 * Generates preload links for critical components
 *
 * @param componentNames - Array of component tag names
 * @returns HTML link tags for preloading
 *
 * @example
 * const preloadLinks = preloadComponents(['bit-button', 'bit-card']);
 * // Insert in <head>: <link rel="modulepreload" href="/components/bit-button.js">
 */
export function preloadComponents(componentNames: string[]): string {
  return componentNames.map((name) => `<link rel="modulepreload" href="/components/${name}.js">`).join('\n');
}

/**
 * Check if Declarative Shadow DOM is supported
 * For progressive enhancement
 *
 * @returns Script that checks browser support
 *
 * @example
 * const supportCheck = checkDeclarativeShadowDOMSupport();
 * // Insert in <head> for early detection
 */
export function checkDeclarativeShadowDOMSupport(): string {
  return `<script>
    window.__DSD_SUPPORTED__ = (() => {
      const template = document.createElement('template');
      return 'shadowRootMode' in template;
    })();
  </script>`;
}

/**
 * Polyfill Declarative Shadow DOM for older browsers
 * Attaches shadow roots from <template shadowrootmode="open">
 *
 * @returns Script that polyfills DSD
 *
 * @example
 * const polyfill = polyfillDeclarativeShadowDOM();
 * // Insert early in <head> before components
 */
export function polyfillDeclarativeShadowDOM(): string {
  return `<script>
    (function() {
      if ('shadowRootMode' in HTMLTemplateElement.prototype) {
        return; // DSD is supported
      }

      // Polyfill for older browsers
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element && node.tagName !== 'TEMPLATE') {
              const template = node.querySelector('template[shadowrootmode]');
              if (template) {
                const mode = template.getAttribute('shadowrootmode');
                if (mode === 'open' || mode === 'closed') {
                  const shadowRoot = node.attachShadow({ mode });
                  shadowRoot.appendChild(template.content.cloneNode(true));
                  template.remove();
                }
              }
            }
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      // Process existing templates
      document.querySelectorAll('template[shadowrootmode]').forEach(template => {
        const parent = template.parentElement;
        if (parent) {
          const mode = template.getAttribute('shadowrootmode');
          if (mode === 'open' || mode === 'closed') {
            const shadowRoot = parent.attachShadow({ mode });
            shadowRoot.appendChild(template.content.cloneNode(true));
            template.remove();
          }
        }
      });
    })();
  </script>`;
}
