/**
 * URLPattern API type declarations
 * Provides TypeScript definitions for the URLPattern API
 * Reference: https://wicg.github.io/urlpattern/
 */

declare global {
  interface URLPatternComponentResult {
    input: string;
    groups: Record<string, string | undefined>;
  }

  interface URLPatternResult {
    inputs: readonly (string | URL | URLPatternInit)[];
    protocol: URLPatternComponentResult;
    username: URLPatternComponentResult;
    password: URLPatternComponentResult;
    hostname: URLPatternComponentResult;
    port: URLPatternComponentResult;
    pathname: URLPatternComponentResult;
    search: URLPatternComponentResult;
    hash: URLPatternComponentResult;
  }

  interface URLPatternInit {
    baseURL?: string;
    hash?: string;
    hostname?: string;
    password?: string;
    pathname?: string;
    port?: string;
    protocol?: string;
    search?: string;
    username?: string;
  }

  /**
   * URLPattern provides a capability to match URLs based on a pattern.
   * Based on the WHATWG URL Standard.
   */
  class URLPattern {
    constructor(input: URLPatternInit | string, baseURL?: string | URL);

    /**
     * Test whether a URL matches this pattern.
     */
    test(input?: URLPatternInit | string | URL): boolean;

    /**
     * Execute against a URL to get the match result and named groups.
     */
    exec(input?: URLPatternInit | string | URL): URLPatternResult | null;

    readonly protocol: URLPatternComponentResult;
    readonly username: URLPatternComponentResult;
    readonly password: URLPatternComponentResult;
    readonly hostname: URLPatternComponentResult;
    readonly port: URLPatternComponentResult;
    readonly pathname: URLPatternComponentResult;
    readonly search: URLPatternComponentResult;
    readonly hash: URLPatternComponentResult;
  }
}

export {};
