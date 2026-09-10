import { html } from '@vielzeug/ore';

export function sectionHeading(eyebrow: string, title: string, description?: string) {
  return html`
    <header class="section-heading">
      <span class="eyebrow">${eyebrow}</span>
      <h2>${title}</h2>
      ${
        description
          ? html`
              <p>${description}</p>
            `
          : ''
      }
    </header>
  `;
}
