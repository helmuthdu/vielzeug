/* -------------------- CookieStorage -------------------- */

export class CookieStorage implements Storage {
  private readonly path: string;
  private readonly sameSite: 'Lax' | 'None' | 'Strict';
  private readonly secure: boolean;

  constructor(options: { path: string; sameSite: 'Lax' | 'None' | 'Strict'; secure: boolean }) {
    this.path = options.path;
    this.sameSite = options.sameSite;
    this.secure = options.secure;
  }

  private assertDocument(): Document {
    if (typeof document === 'undefined') {
      throw new Error('deposit: document.cookie is not available in this environment');
    }

    return document;
  }

  private parseCookieMap(): Map<string, string> {
    const doc = this.assertDocument();
    const map = new Map<string, string>();

    if (!doc.cookie) return map;

    for (const pair of doc.cookie.split(';')) {
      const eq = pair.indexOf('=');

      if (eq === -1) continue;

      map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }

    return map;
  }

  private remove(name: string): void {
    this.assertDocument().cookie = `${name}=; path=${this.path}; max-age=0; SameSite=${this.sameSite}`;
  }

  get length(): number {
    return this.parseCookieMap().size;
  }

  clear(): void {
    for (const name of this.parseCookieMap().keys()) this.remove(name);
  }

  getItem(key: string): string | null {
    const value = this.parseCookieMap().get(key);

    return value === undefined ? null : decodeURIComponent(value);
  }

  key(index: number): string | null {
    const keys = Array.from(this.parseCookieMap().keys());

    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.remove(key);
  }

  setItem(key: string, value: string): void {
    let cookie = `${key}=${encodeURIComponent(value)}; path=${this.path}; SameSite=${this.sameSite}`;

    if (this.secure) cookie += '; Secure';

    this.assertDocument().cookie = cookie;
  }
}
