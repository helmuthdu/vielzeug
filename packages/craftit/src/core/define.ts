/**
 * Craftit - Component Definition
 * Main API for creating web components
 */

import type { ComponentContext } from '../composables/context';
import { maybeGetContext, runCleanups, setContext } from '../composables/context';
import { effect, untrack } from '../core/signal';
import type { TemplateResult } from '../template/html';
import { renderTemplate } from '../template/html';
import { escapeHTML } from '../template/sanitize';
import { runMountCallbacks, runUnmountCallbacks } from './lifecycle';

// WeakMap to store component contexts for parent-child linking
const componentContexts = new WeakMap<HTMLElement, ComponentContext>();

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
    #renderDispose?: () => void;

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
        parent: null,
        provides: new Map(),
        shadow: this.#shadow,
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      // Store context in WeakMap for parent-child linking
      componentContexts.set(this, this.#context);
    }

    connectedCallback(): void {
      console.log(`[craftit] Component ${tagName} connected`);
      // Link to parent context by walking up DOM tree
      this.#resolveParentContext();

      // Run the setup
      this.#runSetup();
    }

    disconnectedCallback(): void {
      console.log(`[craftit] Component ${tagName} disconnected`);
      // Run unmount callbacks
      runUnmountCallbacks(this.#context);

      // Dispose of the render effects
      if (this.#renderDispose) {
        this.#renderDispose();
        this.#renderDispose = undefined;
      }

      // Run cleanups
      runCleanups(this.#context);

      // Mark as unmounted
      this.#context.mounted = false;
    }

    /**
     * Resolve parent context by walking DOM tree
     * Checks both light DOM and shadow DOM boundaries
     */
    #resolveParentContext(): void {
      let parentContext: ComponentContext | null = null;
      let parentElement = this.parentElement;

      // Walk light DOM ancestry
      while (parentElement && !parentContext) {
        parentContext = componentContexts.get(parentElement) || null;
        parentElement = parentElement.parentElement;
      }

      // If no parent in light DOM, check if we're inside a shadow root
      if (!parentContext) {
        const root = this.getRootNode();
        if (root instanceof ShadowRoot && root.host) {
          parentContext = componentContexts.get(root.host as HTMLElement) || null;
        }
      }

      // Fallback to active context if no parent found in DOM
      this.#context.parent = parentContext || maybeGetContext();
    }

    /**
     * Run component setup
     * Extracted to allow retry on errors
     */
    #runSetup(): void {
      // Set this component's context as active
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

        // Render template - wrap in an effect to collect all nested bindings
        // and ensure they can be disposed together
        if (this.#renderDispose) {
          this.#renderDispose();
        }

        // Use untrack to prevent the root render effect from depending on signals
        // that are only meant for child bindings
        this.#renderDispose = effect(() => {
          untrack(() => {
            renderTemplate(template, this.#shadow);
          });
        });

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

    /**
     * Retry component setup after an error
     * Public method that can be called from error UI
     */
    public retryComponent(): void {
      // Clean up any previous state
      if (this.#context.mounted) {
        runUnmountCallbacks(this.#context);
      }
      runCleanups(this.#context);

      // Reset context state
      this.#context.mounted = false;
      this.#context.mountCallbacks = [];
      this.#context.unmountCallbacks = [];
      this.#context.updateCallbacks = [];
      this.#context.cleanups = new Set();

      // Clear shadow root
      this.#shadow.innerHTML = '';

      // Re-run setup
      this.#runSetup();
    }

    /**
     * Apply styles to shadow root
     * Uses adoptedStyleSheets (modern) with fallback to style tag (legacy)
     */
    #applyStyles(styles: string[]): void {
      const css = styles.join('\n');

      // Modern approach: Constructable Stylesheets (Chrome 73+, Firefox 101+, Safari 16.4+)
      if ('adoptedStyleSheets' in Document.prototype && 'replace' in CSSStyleSheet.prototype) {
        const styleSheet = new CSSStyleSheet();
        styleSheet.replaceSync(css);
        this.#shadow.adoptedStyleSheets = [styleSheet];
      } else {
        // Fallback for older browsers: inject <style> tag
        const styleElement = document.createElement('style');
        styleElement.textContent = css;
        this.#shadow.appendChild(styleElement);
      }
    }

    /**
     * Render error UI with retry capability
     */
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
						${escapeHTML(message)}
					</p>
					${stack
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
							">${escapeHTML(stack)}</pre>
						</details>
					`
          : ''
        }
					<button
						id="retry-btn"
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

      // Attach retry handler properly
      const retryBtn = this.#shadow.getElementById('retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.retryComponent();
        });
      }
    }
  }

  // Define the custom element
  customElements.define(tagName, CraftitComponent);
}
