import '../components/activity-signal';
import '@vielzeug/refine/button';
import '@vielzeug/refine/input';
import { define, each, html, onCleanup, onMounted, ref } from '@vielzeug/ore';
import { effect, signal } from '@vielzeug/ripple';
import { createSandbox, type SandboxHandle } from '@vielzeug/sandbox';
import { t } from '../../core/i18n';
import { crmIndex } from '../../core/search';
import { crmData, locale, regenerateDemoData } from '../../core/store';
import { countContactsByTitle } from '../../core/worker-tasks';

const capabilities = [
  {
    copyKey: 'showcase.dataCopy',
    nameKey: 'showcase.data',
    packages: 'Ripple · Illusionist · Courier · Sourcerer · Vault · Postmaster',
  },
  {
    copyKey: 'showcase.interactionCopy',
    nameKey: 'showcase.interaction',
    packages: 'Scout · Scroll · Keymap · Focus · Gesture · Orbit',
  },
  {
    copyKey: 'showcase.workflowCopy',
    nameKey: 'showcase.workflow',
    packages: 'Dnd · Clockwork · Ledger · Herald',
  },
  {
    copyKey: 'showcase.visualizationCopy',
    nameKey: 'showcase.visualization',
    packages: 'Pulse · Flux · Prism · Familiar · Necromancer',
  },
  {
    copyKey: 'showcase.uiInfrastructureCopy',
    nameKey: 'showcase.uiInfrastructure',
    packages: 'Refine · Ore · Wayfinder · Ward · Conduit · Rune',
  },
];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

define('crm-showcase-view', {
  setup() {
    const query = signal('jon smth');
    const workerResult = signal<{ contacts: number; titleGroups: number } | 'analyzing' | 'ready'>('ready');
    const results = () => crmIndex.search(query.value, { limit: 4 });
    const workerStatus = (): string => {
      if (workerResult.value === 'ready') return t('showcase.readyForContacts');
      if (workerResult.value === 'analyzing') return t('showcase.analyzing');
      return `${t('companyDetail.contacts')}: ${workerResult.value.contacts.toLocaleString(locale.value === 'de' ? 'de-DE' : 'en-GB')} · ${t('contacts.title')}: ${workerResult.value.titleGroups.toLocaleString(locale.value === 'de' ? 'de-DE' : 'en-GB')}`;
    };
    const runWorker = async (): Promise<void> => {
      workerResult.value = 'analyzing';
      const contacts = Array.from({ length: 67 }, () => crmData.value.contacts)
        .flat()
        .slice(0, 10_000);
      const counts = await countContactsByTitle(contacts);
      workerResult.value = { contacts: contacts.length, titleGroups: Object.keys(counts).length };
    };
    const sandboxContainer = ref<HTMLElement>();
    let sandbox: SandboxHandle | null = null;
    const renderPreview = (name = 'John', company = 'Acme Corporation'): void => {
      void sandbox?.render(
        `<main><p>${escapeHtml(t('showcase.emailGreeting', { name }))}</p><p>${escapeHtml(t('showcase.emailThanks', { company }))}</p><p>${escapeHtml(t('common.sarahChen'))}<br>Vielzeug CRM</p></main>`,
      );
    };
    onMounted(() => {
      const stop = effect(() => {
        const title = t('showcase.sandboxEmailPreview');
        sandbox?.dispose();
        sandbox = createSandbox(sandboxContainer.value!, {
          namedStyles: {
            base: 'body{margin:0;padding:24px;font:15px/1.6 system-ui;color:#26322d;background:#f7f5ef}main{max-width:42ch}p{margin:0 0 16px}',
          },
          title,
        });
        renderPreview();
      });
      onCleanup(() => {
        stop.dispose();
        sandbox?.dispose();
      });
    });
    return html`
      <header class="page-heading showcase-heading">
        <div>
          <h1>${() => t('showcase.smallTools')}</h1>
          <p>${() => t('showcase.traceInteraction')}</p>
        </div>
        <ore-button variant="outline" @click=${regenerateDemoData}>${() => t('action.regenerateDemoData')}</ore-button>
      </header>
      <section class="composition-map">
        <div class="composition-map__feature">
          <span>${() => t('showcase.pipelineMove')}</span>
          <strong>Dnd</strong>
          <i></i>
          <strong>Clockwork</strong>
          <i></i>
          <strong>Ledger</strong>
          <i></i>
          <strong>Herald</strong>
        </div>
        <p>${() => t('showcase.oneActionFourPackages')}</p>
      </section>
      <section class="module showcase-signal">
        <header>
          <div>
            <h2>${() => t('showcase.oneSignalSixPackages')}</h2>
            <p>${() => t('showcase.pulseHeraldEvents')}</p>
          </div>
        </header>
        <activity-signal activities=${() => crmData.value.activities}></activity-signal>
      </section>
      <div class="showcase-grid">
        ${each(
          capabilities,
          (item) => item.nameKey,
          (item) => html`
            <section class="showcase-capability">
              <h2>${() => t(item.value.nameKey)}</h2>
              <strong>${() => item.value.packages}</strong>
              <p>${() => t(item.value.copyKey)}</p>
            </section>
          `,
        )}
      </div>
      <div class="showcase-labs">
        <section class="data-panel">
          <header>
            <div>
              <h2>${() => t('showcase.scoutFuzzySearch')}</h2>
              <p>${() => t('showcase.tryMisspelledName')}</p>
            </div>
          </header>
          <ore-input
            label=${() => t('showcase.scoutFuzzySearch')}
            value=${query}
            @input=${(event: Event) => {
              query.value = (event as CustomEvent<{ value: string }>).detail.value;
            }}></ore-input>
          <div class="mini-results">
            ${() =>
              results()
                .map((result) => `${result.item.kind}: ${result.item.label}`)
                .join(' · ')}
          </div>
        </section>
        <section class="data-panel">
          <header>
            <div>
              <h2>${() => t('showcase.sandboxEmailPreview')}</h2>
              <p>${() => t('showcase.renderedInIframe')}</p>
            </div>
          </header>
          <div class="sandbox-preview" ref=${sandboxContainer}></div>
        </section>
        <section class="data-panel">
          <header>
            <div>
              <h2>${() => t('showcase.familiarWorker')}</h2>
              <p>${() => t('showcase.processLargeDataset')}</p>
            </div>
          </header>
          <strong class="worker-result">${workerStatus}</strong>
          <ore-button variant="outline" @click=${() => void runWorker()}>
            ${() => t('action.analyzeContacts')}
          </ore-button>
        </section>
      </div>
    `;
  },
  shadow: false,
});

export function createShowcaseView(): HTMLElement {
  return document.createElement('crm-showcase-view');
}
