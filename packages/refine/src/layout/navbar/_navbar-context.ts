import { createContext } from '@vielzeug/ore';
import type { Readable } from '@vielzeug/ripple';

/** Context provided by `ore-navbar` to its descendants. */
export type NavbarContext = {
  /** Current `active-url` of the navbar; items derive their own active state from it. */
  activeUrl: Readable<string | undefined>;
  closeMobileMenu: () => void;
  isMobile: Readable<boolean>;
  mobileMenuOpen: Readable<boolean>;
};

/** Injection key for navbar context. */
export const NAVBAR_CTX = createContext<NavbarContext>('NavbarContext');
