import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/code-window';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/navbar';
import './icons';
import { define, html, onMounted } from '@vielzeug/ore';
import { signal } from '@vielzeug/ripple';
import {
  buildAreas,
  buildHeading,
  buildNote,
  contactSection,
  featuredProject,
  footerLinks,
  hero,
  mobileNavLinks,
  navLinks,
  newTabAffordance,
  philosophy,
  schemeToggle,
  site,
  studio,
  workHeading,
} from '../core/content';
import { observeReveals } from '../core/reveal';
import { initScheme, type Scheme } from '../core/scheme';
import { observeActiveSections } from '../core/scroll-spy';

const outbound = (label: string) => html`
  ${label} <span aria-hidden="true">→</span><span class="visually-hidden">${newTabAffordance}</span>
`;

const navItems = (slot?: string) =>
  navLinks.map(
    (link) => html`
    <ore-navbar-item
      href=${link.href}
      rel=${link.external ? 'noopener noreferrer' : null}
      slot=${slot ?? null}
      target=${link.external ? '_blank' : null}>
      ${link.external ? outbound(link.label) : link.label}
    </ore-navbar-item>
  `,
  );

const mobileDock = html`
  <nav aria-label="Section navigation" class="mobile-dock">
    ${mobileNavLinks.map(
      (link) => html`
      <a data-scroll-link href=${link.href}>
        <ore-icon name=${link.icon} size="20"></ore-icon>
        <span>${link.label}</span>
      </a>
    `,
    )}
  </nav>
`;

const heroSection = html`
  <section class="hero" id="top">
    <picture aria-hidden="true" class="hero__art">
      <img alt="" fetchpriority="high" height="768" src=${hero.image} width="1376" />
    </picture>
    <div aria-hidden="true" class="hero__shade"></div>
    <div class="container hero__layout">
      <div class="hero__copy">
        <h1 class="display">${hero.titleLead} <span class="hero__accent">${hero.titleAccent}</span></h1>
        <p class="hero__lede">${hero.lede}</p>
      </div>
      <div class="hero__actions">
        <ore-button color="primary" href="#work" rounded="md" size="lg">${hero.primaryCta}</ore-button>
        <ore-button href="#contact" rounded="md" size="lg" variant="outline">${hero.secondaryCta}</ore-button>
      </div>
    </div>
  </section>
`;

const philosophySection = html`
  <section class="philosophy" data-reveal id="philosophy">
    <div class="container philosophy__layout">
      <div class="philosophy__copy">
        <h2>${philosophy.heading}</h2>
        <p>${philosophy.body[0]}</p>
        <ul aria-label="What a tabletop game can involve" class="game-elements">
          ${philosophy.examples.map(
            (example) => html`
            <li>${example}</li>
          `,
          )}
        </ul>
        <p>${philosophy.body[1]}</p>
      </div>
      <blockquote class="mantra">
        ${philosophy.mantra.map(
          (line, index) => html`
          <span class="display mantra__line" style=${`--i: ${index}`}>${line}</span>
        `,
        )}
      </blockquote>
    </div>
  </section>
`;

const buildSection = html`
  <section class="areas" data-reveal id="areas">
    <div class="container">
      <header class="areas__header">
        <h2>${buildHeading}</h2>
        <p>${buildNote}</p>
      </header>
      <div class="area-grid">
        ${buildAreas.map(
          (area) => html`
          <ore-card class="area-card" elevation="1" padding="lg" variant="flat">
            <ore-icon name=${area.icon} size="24" slot="header"></ore-icon>
            <h3 slot="header">${area.title}</h3>
            <p>${area.description}</p>
          </ore-card>
        `,
        )}
      </div>
    </div>
  </section>
`;

const screenshot = (scheme: () => Scheme) => html`
  <figure class="shot">
    <img
      alt=${() => featuredProject.images[scheme()].alt}
      height="900"
      loading="lazy"
      src=${() => featuredProject.images[scheme()].src}
      width="1440" />
    <figcaption>${() => featuredProject.images[scheme()].caption}</figcaption>
  </figure>
`;

const journalWindow = (scheme: () => Scheme) => html`
  <ore-code-window
    class="project-window"
    style="--code-window-body-padding: 0;"
    title=${featuredProject.title}
    variant="chat">
    ${screenshot(scheme)}
  </ore-code-window>
`;

const workSection = (scheme: () => Scheme) => html`
  <section class="work" data-reveal id="work">
    <div class="container">
      <header class="work__header">
        <h2>${workHeading}</h2>
      </header>
      <article class="project">
        <div class="project__intro">
          <p class="project__kind">${featuredProject.badge}</p>
          <h3 class="display">${featuredProject.title}</h3>
          <p class="project__subtitle">${featuredProject.subtitle}</p>
          <p class="project__description">${featuredProject.description}</p>
        </div>
        ${journalWindow(scheme)}
        <div class="project__footer">
          <div class="project__features">
            ${featuredProject.features.map(
              (feature) => html`
              <span>${feature}</span>
            `,
            )}
          </div>
          <a
            class="text-link"
            href=${featuredProject.href}
            rel="noopener noreferrer"
            target="_blank">
            ${outbound(featuredProject.cta)}
          </a>
        </div>
        <p class="project__disclaimer">${featuredProject.disclaimer}</p>
      </article>
    </div>
  </section>
`;

const foundationSection = html`
  <section class="foundation" data-reveal id="stack">
    <div class="container foundation__layout">
      <div>
        <h2>Built with a strong technical foundation</h2>
        <p class="foundation__stack">TypeScript <span aria-hidden="true">·</span> Vielzeug</p>
      </div>
      <div>
        <p>${studio.vielzeug.body}</p>
        <a class="text-link" href=${studio.vielzeug.href} rel="noopener noreferrer" target="_blank">
          ${outbound(studio.vielzeug.cta)}
        </a>
      </div>
    </div>
  </section>
`;

const studioSection = html`
  <section class="studio" data-reveal id="about">
    <div class="container studio__layout">
      <div>
        <h2>${studio.heading}</h2>
        ${studio.body.map(
          (line) => html`
          <p class="studio__body">${line}</p>
        `,
        )}
      </div>
    </div>
  </section>
`;

const contactSectionMarkup = html`
  <section class="contact" data-reveal id="contact">
    <div class="container contact__layout">
      <div>
        <h2 class="display">${contactSection.heading}</h2>
        <p class="contact__body">${contactSection.body}</p>
      </div>
      <ore-button color="primary" href=${`mailto:${site.email}`} rounded="md" size="lg">
        ${contactSection.cta} <span aria-hidden="true">→</span>
      </ore-button>
    </div>
  </section>
`;

const footer = html`
  <footer class="footer">
    <div class="container footer__inner">
      <p class="footer__wordmark">${site.wordmark}</p>
      <nav aria-label="Footer" class="footer__links">
        ${footerLinks.map(
          (link) => html`
          <a href=${link.href} rel=${link.external ? 'noopener noreferrer' : null} target=${link.external ? '_blank' : null}>
            ${link.external ? outbound(link.label) : link.label}
          </a>
        `,
        )}
      </nav>
      <p class="footer__copy">${site.copyright}</p>
    </div>
  </footer>
`;

define('brettzeug-page', {
  setup() {
    const scheme = signal<Scheme>('light');
    const theme = initScheme();
    scheme.value = theme.current();
    const toggle = (): void => {
      theme.set(scheme.value === 'dark' ? 'light' : 'dark');
      scheme.value = theme.current();
    };
    const isDark = () => scheme.value === 'dark';

    onMounted(() => {
      const disposeReveals = observeReveals(document);
      const disposeActiveSections = observeActiveSections(document);
      return () => {
        disposeActiveSections();
        disposeReveals();
        theme.dispose();
      };
    });
    return html`
      <a class="skip-link" href="#main-content">Skip to content</a>
      <ore-navbar class="site-header" label="Main navigation" rounded="none" sticky variant="flat">
        <a class="wordmark" href="#top" slot="logo">${site.wordmark}</a>
        ${navItems()}
        ${navItems('mobile-menu')}
        <ore-button
          aria-pressed=${() => String(isDark())}
          class="scheme-toggle"
          icon-only
          label=${() => (isDark() ? schemeToggle.toLight : schemeToggle.toDark)}
          @click=${toggle}
          rounded="full"
          size="sm"
          slot="persistent"
          variant="ghost">
          <ore-icon name=${() => (isDark() ? 'sun' : 'moon')} size="18"></ore-icon>
        </ore-button>
      </ore-navbar>
      <main id="main-content">
        ${heroSection}
        ${philosophySection}
        ${buildSection}
        ${workSection(() => scheme.value)}
        ${foundationSection}
        ${studioSection}
        ${contactSectionMarkup}
      </main>
      ${mobileDock}
      ${footer}
    `;
  },
  shadow: false,
});

export function createAppShell(): HTMLElement {
  return document.createElement('brettzeug-page');
}
