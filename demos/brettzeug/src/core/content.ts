/**
 * All page copy lives here, separated from presentation.
 * Keep this file free of imports so it can be tested in a plain Node environment.
 */

export type NavLink = {
  readonly external?: boolean;
  readonly href: string;
  readonly label: string;
};

export type ProjectImage = {
  readonly alt: string;
  readonly caption: string;
  readonly src: string;
};

export const site = {
  copyright: '© 2026 Brettzeug',
  description: 'Brettzeug creates thoughtful digital products and companion tools for tabletop and board games.',
  email: 'hello@vielzeug.dev',
  tagline: 'Digital tools for tabletop games.',
  title: 'Brettzeug: Digital tools for tabletop games',
  wordmark: 'BRETTZEUG',
} as const;

export const navLinks: readonly NavLink[] = [
  { href: '#work', label: 'Work' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
];

export const mobileNavLinks = [
  { href: '#work', icon: 'layout-grid', label: 'Work' },
  { href: '#philosophy', icon: 'book-open', label: 'Idea' },
  { href: '#areas', icon: 'layers-2', label: 'Build' },
  { href: '#about', icon: 'user-round', label: 'About' },
  { href: '#contact', icon: 'mail', label: 'Contact' },
] as const;

/**
 * Visually-hidden suffix announced on links that open a new tab, so keyboard
 * and screen-reader users get the same warning sighted users get from the
 * outbound arrow. The `→` arrow is reserved for links that leave the page.
 */
export const newTabAffordance = '(opens in a new tab)' as const;

export const schemeToggle = {
  toDark: 'Switch to dark mode',
  toLight: 'Switch to light mode',
} as const;

export const hero = {
  image: './bg_hero.jpeg',
  lede: 'We build thoughtful digital products that make complex board games easier to manage, explore, and enjoy.',
  primaryCta: 'View our work',
  secondaryCta: 'Get in touch',
  title: 'Digital tools for tabletop games.',
  titleAccent: 'tabletop games.',
  titleLead: 'Digital tools for',
} as const;

export const philosophy = {
  body: [
    'Board games are wonderfully tactile. But modern games can come with a lot to manage.',
    'Brettzeug builds digital tools that handle the complexity without taking away from the physical game.',
  ],
  examples: ['Campaigns', 'Characters', 'Cards', 'Resources', 'Progression', 'Rules'],
  heading: 'Built around the table',
  mantra: ['Less bookkeeping.', 'Less searching.', 'More playing.'],
} as const;

export const buildHeading = 'What we build' as const;

export const buildAreas = [
  {
    description: 'Digital companions that manage the information and administration around a game.',
    icon: 'layers-2',
    title: 'Companion apps',
  },
  {
    description: 'Keep campaigns, characters, progression, equipment, and history organized in one place.',
    icon: 'book-open',
    title: 'Campaign tools',
  },
  {
    description:
      'Purpose-built tools that solve specific problems around the table: from deck building to setup and reference.',
    icon: 'boxes',
    title: 'Tabletop utilities',
  },
] as const;

export const buildNote = 'Not every product category exists yet.' as const;

export const workHeading = 'Our work' as const;

export const featuredProject = {
  badge: 'Fan-made project',
  cta: 'Visit The Hunter’s Journal',
  description:
    'A free fan-made companion for managing campaigns, hunters, progression, crafting, equipment, decks, expeditions, and other information around the physical game.',
  disclaimer:
    'The Hunter’s Journal is an unofficial fan-made project and is not affiliated with, endorsed by, or sponsored by Reggie Games.',
  features: ['Campaigns', 'Decks', 'Crafting', 'Expeditions'],
  href: 'https://vielzeug.dev/demos/primal/',
  images: {
    dark: {
      alt: 'The Hunter’s Journal home screen in its dark theme, showing the campaign menu beside the hunter illustration',
      caption: 'Dark theme',
      src: './projects/app_hunters_journal_dark.png',
    },
    light: {
      alt: 'The Hunter’s Journal home screen in its light theme, showing the campaign menu beside the hunter illustration',
      caption: 'Light theme',
      src: './projects/app_hunters_journal_light.png',
    },
  } satisfies Record<'dark' | 'light', ProjectImage>,
  subtitle: 'An unofficial digital companion for Primal: The Awakening',
  title: 'The Hunter’s Journal',
} as const;

export const studio = {
  body: [
    'Brettzeug is an independent studio focused on the space where software meets tabletop gaming.',
    'We’re interested in making digital products that respect what makes physical games special while using technology where it genuinely adds value.',
  ],
  heading: 'A small studio with a simple idea',
  vielzeug: {
    body: 'Brettzeug shares an engineering mindset with Vielzeug, an open-source TypeScript toolkit created by the studio’s founder.',
    cta: 'Explore Vielzeug',
    href: 'https://vielzeug.dev',
  },
} as const;

export const contactSection = {
  body: 'Interested in building a digital companion or tool for a tabletop game?',
  cta: 'Let’s talk',
  heading: 'Have an idea?',
} as const;

export const footerLinks: readonly NavLink[] = [
  { href: '#work', label: 'Work' },
  { external: true, href: 'https://vielzeug.dev', label: 'Built with Vielzeug' },
  { href: '#contact', label: 'Contact' },
];
