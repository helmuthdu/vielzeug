/**
 * Craftit - Component Definition
 * Main API for creating web components
 */

import type { ComponentContext } from '../composables/context';
import { runCleanups, setContext } from '../composables/context';
import type { TemplateResult } from '../template/html';
import { renderTemplate } from '../template/html';
import { runMountCallbacks, runUnmountCallbacks } from './lifecycle';

/**
 * Setup function result
 */
export type SetupResult =
  | TemplateResult
  | {
      template: TemplateResult;
      styles?: string[];
    };

/**
 * Setup function type
 */
export type SetupFunction = () => SetupResult;

/**
 * Define a custom element
 */
export function define(tagName: string, setup: SetupFunction): void {
  // Check if already defined
  if (customElements.get(tagName)) {
    console.warn(`[craftit] Element "${tagName}" is already defined`);
    return;
  }

  // Validate tag name
  if (!tagName.includes('-')) {
    throw new Error(`[craftit] Custom element tag name "${tagName}" must contain a hyphen (-)`);
  }

  class CraftitComponent extends HTMLElement {
    #context: ComponentContext;
    #shadow: ShadowRoot;

    constructor() {
      super();

      // Create shadow root
      this.#shadow = this.attachShadow({ mode: 'open' });

      // Initialize context
      this.#context = {
        cleanups: new Set(),
        element: this,
        mountCallbacks: [],
        mounted: false,
        name: tagName,
        parent: null, // Can be set if nested components need context inheritance
        provides: new Map(),
        shadow: this.#shadow,
        unmountCallbacks: [],
        updateCallbacks: [],
      };
    }

    connectedCallback(): void {
      // Set context
      setContext(this.#context);

      try {
        // Run setup function
        const result = setup();

        // Extract template and styles
        let template: TemplateResult;
        let styles: string[] = [];

        if ('template' in result) {
          template = result.template;
          styles = result.styles || [];
        } else {
          template = result;
        }

        // Apply styles
        if (styles.length > 0) {
          this.#applyStyles(styles);
        }

        // Render template
        renderTemplate(template, this.#shadow);

        // Mark as mounted
        this.#context.mounted = true;

        // Run mount callbacks
        runMountCallbacks(this.#context);
      } catch (error) {
        console.error(`[craftit] Error in setup for ${tagName}:`, error);
        this.#renderError(error);
      } finally {
        setContext(null);
      }
    }

    disconnectedCallback(): void {
      // Run unmount callbacks
      runUnmountCallbacks(this.#context);

      // Run cleanups
      runCleanups(this.#context);

      // Mark as unmounted
      this.#context.mounted = false;
    }

    #applyStyles(styles: string[]): void {
      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(styles.join('\n'));
      this.#shadow.adoptedStyleSheets = [styleSheet];
    }

    #renderError(error: unknown): void {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';

      this.#shadow.innerHTML = `
				<div style="
					color: #dc2626;
					padding: 1rem;
					border: 2px solid #dc2626;
					border-radius: 0.5rem;
					font-family: monospace;
					background: #fef2f2;
				">
					<strong style="display: block; margin-bottom: 0.5rem; font-size: 1.1em;">
						⚠️ Component Error
					</strong>
					<p style="margin: 0.5rem 0; font-family: monospace;">
						${escapeHtml(message)}
					</p>
					${
            stack
              ? `
						<details style="margin-top: 0.5rem;">
							<summary style="cursor: pointer; user-select: none;">
								Stack Trace
							</summary>
							<pre style="
								margin: 0.5rem 0 0 0;
								padding: 0.5rem;
								background: white;
								border-radius: 0.25rem;
								overflow-x: auto;
								font-size: 0.85em;
							">${escapeHtml(stack)}</pre>
						</details>
					`
              : ''
          }
					<button
						onclick="this.getRootNode().host.remove(); this.getRootNode().host.connectedCallback()"
						style="
							margin-top: 0.5rem;
							padding: 0.25rem 0.5rem;
							cursor: pointer;
							background: #dc2626;
							color: white;
							border: none;
							border-radius: 0.25rem;
							font-family: inherit;
						"
					>
						Retry
					</button>
				</div>
			`;
    }
  }

  // Define the custom element
  customElements.define(tagName, CraftitComponent);
}

/**
 * Escape HTML for error messages
 */
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
