import '@vielzeug/refine/avatar';
import '@vielzeug/refine/button';
import '@vielzeug/refine/command-palette';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/popover';
import '@vielzeug/refine/radio';
import '@vielzeug/refine/radio-group';
import '@vielzeug/refine/sidebar';
import '@vielzeug/refine/toast';
import './components/record-dialog';
import './components/record-drawer';
import { createKeymap } from '@vielzeug/keymap';
import { define, each, getHost, html, onCleanup, onMounted, when } from '@vielzeug/ore';
import { toast } from '@vielzeug/refine/toast';
import { computed, effect, signal } from '@vielzeug/ripple';
import { can } from '../core/auth';
import { bus } from '../core/events';
import { formatAmount } from '../core/format';
import { ledger } from '../core/history';
import { setLocale, t } from '../core/i18n';
import { reconnect, simulateOffline } from '../core/offline';
import { presence, simulateLiveActivity } from '../core/realtime';
import { type RouteName, routeHref, router } from '../core/router';
import { crmIndex } from '../core/search';
import { demoUsers } from '../core/seed-data';
import { leadsNeedingAttention, openPipeline, stageTotals, weightedPipeline } from '../core/selectors';
import { activeRoute, activeRouteParams, crmData, currentUser, locale, networkStatus } from '../core/store';
import { setThemePreference, themePreference } from '../core/theme';
import { openRecordDialog } from './components/record-dialog';
import { openRecordDrawer } from './components/record-drawer';

interface PaletteItem {
  group: string;
  label: string;
  value: string;
}

interface SidebarElement extends HTMLElement {
  closeMobile(): void;
}

const routes: RouteName[] = [
  'dashboard',
  'pipeline',
  'opportunities',
  'leads',
  'companies',
  'contacts',
  'activity',
  'showcase',
];

const routePaths: Partial<Record<RouteName, string>> = {
  activity: routeHref(router.url('activity')),
  companies: routeHref(router.url('companies')),
  contacts: routeHref(router.url('contacts')),
  dashboard: routeHref(router.url('dashboard')),
  leads: routeHref(router.url('leads')),
  opportunities: routeHref(router.url('opportunities')),
  pipeline: routeHref(router.url('pipeline')),
  showcase: routeHref(router.url('showcase')),
};

function labelFor(route: string | null): string {
  if (route === 'companyDetail') return t('nav.companyProfile');
  return t(`nav.${route ?? 'dashboard'}`);
}

function recordGroupLabel(group: string): string {
  if (group === 'Companies') return t('nav.companies');
  if (group === 'Contacts') return t('nav.contacts');
  if (group === 'Leads') return t('nav.leads');
  return t('nav.opportunities');
}

function routeFromHref(href: string): RouteName | null {
  const url = new URL(href, window.location.href);
  const destination = `${url.pathname}${url.hash}`;

  return routes.find((route) => routePaths[route] === destination) ?? null;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

async function createView(route: string | null, companyId: string): Promise<HTMLElement> {
  if (route === 'companyDetail') return (await import('./views/company-detail')).createCompanyDetailView(companyId);
  if (route === 'pipeline') return (await import('./views/pipeline')).createPipelineView();
  if (route === 'contacts') return (await import('./views/contacts')).createContactsView();
  if (route === 'activity') return (await import('./views/activity')).createActivityView();
  if (route === 'showcase') return (await import('./views/showcase')).createShowcaseView();
  if (route === 'companies') return (await import('./views/records')).createCompaniesView();
  if (route === 'leads') return (await import('./views/records')).createLeadsView();
  if (route === 'opportunities') return (await import('./views/records')).createOpportunitiesView();
  return (await import('./views/dashboard')).createDashboardView();
}

function typing(event: KeyboardEvent): boolean {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable),
    );
}

define('crm-app-shell', {
  setup() {
    const host = getHost();
    const query = signal('');
    const paletteOpen = signal(false);
    const userMenuOpen = signal(false);
    const routeState = signal<'error' | 'loading' | 'ready'>('loading');
    const presenceUsers = computed(() => [...presence.value.entries()].map(([id, user]) => ({ id, name: user.name })));
    const pipelineValue = computed(() => openPipeline(crmData.value));
    const pipelineConfidence = computed(() =>
      pipelineValue.value ? (weightedPipeline(crmData.value) / pipelineValue.value) * 100 : 0,
    );
    const pipelineAttention = computed(() => leadsNeedingAttention(crmData.value, '2026-08-31T12:00:00Z').length);
    const pipelineSegments = computed(() =>
      stageTotals(crmData.value)
        .filter((item) => item.stage !== 'closed-won' && item.stage !== 'closed-lost')
        .map((item) => ({ ...item, share: pipelineValue.value ? (item.value / pipelineValue.value) * 100 : 0 })),
    );
    const presenceLabel = computed(() => {
      const names = presenceUsers.value.map((user) => user.name);
      return names.length ? t('presence.viewing', { names: names.join(', ') }) : t('presence.noTeammatesViewing');
    });
    let retryView = (): void => {};
    const navigate = (route: RouteName): void => {
      void router.navigate({ name: route });
    };
    const cycleTheme = (): void =>
      setThemePreference(
        themePreference.value === 'light' ? 'dark' : themePreference.value === 'dark' ? 'system' : 'light',
      );
    const selectUser = (event: Event): void => {
      const id = (event.currentTarget as HTMLElement & { value: string }).value;
      const user = demoUsers.find((item) => item.id === id);
      if (user) currentUser.value = user;
      userMenuOpen.value = false;
    };
    const runHistory = (action: () => Promise<void>): void => {
      void action().catch(() => toast.add({ color: 'error', message: t('action.historyFailed') }));
    };
    const paletteItems = (): PaletteItem[] => {
      const items: PaletteItem[] = [
        ...routes.map((route) => ({
          group: t('commandPalette.navigate'),
          label: t('commandPalette.goTo', { name: t(`nav.${route}`) }),
          value: `nav:${route}`,
        })),
        ...(can('create')
          ? [
              { group: t('commandPalette.create'), label: t('action.createCompany'), value: 'create:company' },
              { group: t('commandPalette.create'), label: t('action.createContact'), value: 'create:contact' },
              { group: t('commandPalette.create'), label: t('action.createLead'), value: 'create:lead' },
              {
                group: t('commandPalette.create'),
                label: t('action.createOpportunity'),
                value: 'create:opportunity',
              },
            ]
          : []),
        { group: t('commandPalette.actions'), label: t('action.toggleTheme'), value: 'action:theme' },
        { group: t('commandPalette.actions'), label: t('action.undo'), value: 'action:undo' },
        { group: t('commandPalette.actions'), label: t('action.redo'), value: 'action:redo' },
      ];
      if (!query.value.trim()) return items;
      return [
        ...items.filter((item) => item.label.toLowerCase().includes(query.value.toLowerCase())),
        ...crmIndex.search(query.value, { limit: 12 }).map((result) => ({
          group: recordGroupLabel(result.item.kind),
          label: result.item.label,
          value: `record:${result.item.kind}:${result.item.id}`,
        })),
      ];
    };
    const selectPaletteItem = (value: string): void => {
      if (value.startsWith('nav:')) navigate(value.slice(4) as RouteName);
      else if (value.startsWith('create:'))
        openRecordDialog(value.slice(7) as 'company' | 'contact' | 'lead' | 'opportunity');
      else if (value === 'action:theme') cycleTheme();
      else if (value === 'action:undo') runHistory(() => ledger.undo());
      else if (value === 'action:redo') runHistory(() => ledger.redo());
      else if (value.startsWith('record:')) {
        const [, group, id] = value.split(':');
        const kind =
          group === 'Companies'
            ? 'company'
            : group === 'Contacts'
              ? 'contact'
              : group === 'Leads'
                ? 'lead'
                : 'opportunity';
        if (kind === 'company') void router.navigate({ name: 'companyDetail', params: { id } });
        else {
          navigate(kind === 'contact' ? 'contacts' : kind === 'lead' ? 'leads' : 'opportunities');
          openRecordDrawer(kind, id);
        }
      }
    };

    onMounted(() => {
      toast.configure({ position: 'bottom-right' });
      const viewHost = host.querySelector<HTMLElement>('.route-view')!;
      const sidebar = host.querySelector<SidebarElement>('#crm-sidebar')!;
      const palette = host.querySelector<HTMLElement & { items: PaletteItem[] }>('ore-command-palette')!;
      const status = host.querySelector<HTMLButtonElement>('.status-control')!;
      const localeButton = host.querySelector<HTMLButtonElement>('.locale-button')!;
      const themeButton = host.querySelector<HTMLButtonElement>('.theme-button')!;
      const mobileTheme = host.querySelector<HTMLElement>('.mobile-theme')!;
      const mobileLocale = host.querySelector<HTMLElement>('.mobile-locale')!;
      const mobileNetwork = host.querySelector<HTMLElement>('.mobile-network')!;
      const searches = [...host.querySelectorAll<HTMLButtonElement>('.search-trigger')];
      const breadcrumb = host.querySelector<HTMLElement>('.topbar-context')!;
      let renderId = 0;
      const renderView = async (route: string | null, companyId: string): Promise<void> => {
        const id = ++renderId;
        routeState.value = 'loading';
        viewHost.replaceChildren();
        retryView = () => void renderView(route, companyId);
        try {
          const view = await createView(route, companyId);
          if (id === renderId) {
            viewHost.replaceChildren(view);
            routeState.value = 'ready';
          }
        } catch {
          if (id === renderId) routeState.value = 'error';
        }
      };
      const stops = [
        effect(() => {
          const route = activeRoute.value;
          const companyId = String(activeRouteParams.value.id ?? '');
          void currentUser.value;
          void renderView(route, companyId);
          breadcrumb.textContent = labelFor(route);
          document.title = `${labelFor(route)} · Vielzeug CRM`;
          for (const item of host.querySelectorAll<HTMLElement>('ore-sidebar-item[data-route]')) {
            const target = item.dataset.route;
            const active = target === route || (route === 'companyDetail' && target === 'companies');
            item.toggleAttribute('active', active);
          }
        }),
        effect(() => {
          status.dataset.status = networkStatus.value;
          status.querySelector('span')!.textContent =
            networkStatus.value === 'offline'
              ? t('status.offline')
              : networkStatus.value === 'syncing'
                ? t('status.syncing')
                : t('status.online');
          mobileNetwork.textContent =
            networkStatus.value === 'offline' ? t('status.reconnectNetwork') : t('status.simulateOffline');
        }),
        effect(() => {
          const current = locale.value;
          const next = current === 'en' ? 'de' : 'en';
          const label = t('topbar.languageLabel', {
            current: t(`topbar.languageName.${current}`),
            next: t(`topbar.languageName.${next}`),
          });
          localeButton.textContent = current.toUpperCase();
          localeButton.ariaLabel = label;
          localeButton.title = label;
          document.documentElement.lang = current;
          host.dataset.role = currentUser.value.role;
          palette.items = paletteItems();
        }),
        effect(() => {
          const preference = themePreference.value;
          const next = preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light';
          const icon = preference === 'light' ? 'sun' : preference === 'dark' ? 'moon' : 'monitor';
          const label = t('theme.themeLabel', { next: t(`theme.${next}`), preference: t(`theme.${preference}`) });
          themeButton.querySelector('ore-icon')?.setAttribute('name', icon);
          themeButton.ariaLabel = label;
          themeButton.title = label;
          mobileTheme.setAttribute('aria-label', label);
          mobileTheme.title = label;
        }),
      ];
      palette.items = paletteItems();
      const navigationListener = (event: MouseEvent): void => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const path = event.composedPath();
        const routeHost = path.find(
          (target): target is HTMLElement => target instanceof HTMLElement && Boolean(target.dataset.route),
        );
        const anchor = path.find((target): target is HTMLAnchorElement => target instanceof HTMLAnchorElement);
        const route =
          (routeHost?.dataset.route as RouteName | undefined) ?? (anchor ? routeFromHref(anchor.href) : null);
        if (!route) return;

        event.preventDefault();
        navigate(route);
        sidebar.closeMobile();
      };
      const searchListener = (): void => {
        query.value = '';
        paletteOpen.value = true;
      };
      const statusListener = (): void => {
        networkStatus.value === 'offline' ? void reconnect() : simulateOffline();
      };
      const localeListener = (): void => {
        void setLocale(locale.value === 'en' ? 'de' : 'en');
      };
      const paletteSearchListener = (event: Event): void => {
        query.value = (event as CustomEvent<{ query: string }>).detail.query;
        palette.items = paletteItems();
      };
      const paletteSelectListener = (event: Event): void => {
        selectPaletteItem((event as CustomEvent<{ value: string }>).detail.value);
      };
      sidebar.addEventListener('click', navigationListener);
      for (const search of searches) search.addEventListener('click', searchListener);
      status.addEventListener('click', statusListener);
      themeButton.addEventListener('click', cycleTheme);
      localeButton.addEventListener('click', localeListener);
      mobileTheme.addEventListener('click', cycleTheme);
      mobileLocale.addEventListener('click', localeListener);
      mobileNetwork.addEventListener('click', statusListener);
      palette.addEventListener('search', paletteSearchListener);
      palette.addEventListener('select', paletteSelectListener);
      const keymap = createKeymap(
        [
          {
            handler: () => {
              if (ledger.state.value.redo.length) runHistory(() => ledger.redo());
            },
            id: 'redo',
            shortcut: 'mod+shift+z',
          },
          {
            handler: () => {
              if (ledger.state.value.undo.length) runHistory(() => ledger.undo());
            },
            id: 'undo',
            shortcut: 'mod+z',
          },
        ],
        { when: (event) => !typing(event) },
      );
      const unmountKeymap = keymap.mount(document);
      const unsubscribeToast = bus.on('toast:show', ({ action, message, variant }) =>
        toast.add({
          actions: action ? [{ label: action.label, onClick: action.run }] : undefined,
          color: variant,
          message,
        }),
      );
      const createListener = (): void => {
        openRecordDialog('opportunity');
      };
      const undoListener = (): void => runHistory(() => ledger.undo());
      const liveListener = (): void => simulateLiveActivity();
      document.addEventListener('crm:create-opportunity', createListener);
      document.addEventListener('crm:undo', undoListener);
      document.addEventListener('crm:simulate-live', liveListener);
      onCleanup(() => {
        renderId += 1;
        for (const stop of stops) stop.dispose();
        unsubscribeToast();
        unmountKeymap();
        keymap.dispose();
        sidebar.removeEventListener('click', navigationListener);
        for (const search of searches) search.removeEventListener('click', searchListener);
        status.removeEventListener('click', statusListener);
        themeButton.removeEventListener('click', cycleTheme);
        localeButton.removeEventListener('click', localeListener);
        mobileTheme.removeEventListener('click', cycleTheme);
        mobileLocale.removeEventListener('click', localeListener);
        mobileNetwork.removeEventListener('click', statusListener);
        palette.removeEventListener('search', paletteSearchListener);
        palette.removeEventListener('select', paletteSelectListener);
        document.removeEventListener('crm:create-opportunity', createListener);
        document.removeEventListener('crm:undo', undoListener);
        document.removeEventListener('crm:simulate-live', liveListener);
      });
    });

    return html`
      <a class="skip-link" href="#crm-main">${() => t('topbar.skipToMain')}</a>
      <ore-grid class="signal-shell" gap="none">
        <ore-sidebar
          id="crm-sidebar"
          class="app-sidebar"
          collapsible
          close-on-select
          responsive="(max-width: 1180px)"
          bottom-nav-at="(max-width: 920px)"
          label=${() => t('topbar.workspaceSections')}
          collapse-label=${() => t('topbar.collapseSidebar')}
          expand-label=${() => t('topbar.expandSidebar')}
          mobile-close-label=${() => t('topbar.closeSidebar')}>
          <a
            class="rail-brand"
            slot="logo"
            href=${routePaths.dashboard}
            data-route="dashboard"
            aria-label="Vielzeug CRM">
            <span></span>
            <span></span>
            <span></span>
          </a>
          <span class="sidebar-brand-copy" slot="header">
            <strong>Vielzeug</strong>
            <small>${() => t('context.revenueWorkspace')}</small>
          </span>

          <ore-sidebar-item
            href=${routePaths.dashboard}
            data-route="dashboard"
            bottom-nav
            bottom-nav-label=${() => t('nav.overview')}
            label=${() => t('nav.overview')}
            title=${() => t('nav.overview')}>
            <ore-icon slot="icon" name="layout-dashboard" size="19"></ore-icon>
            ${() => t('nav.overview')}
          </ore-sidebar-item>
          <ore-sidebar-group label=${() => t('nav.sales')}>
            <ore-sidebar-item
              href=${routePaths.pipeline}
              data-route="pipeline"
              bottom-nav
              bottom-nav-label=${() => t('nav.pipeline')}
              label=${() => t('nav.pipeline')}
              title=${() => t('nav.pipeline')}>
              <ore-icon slot="icon" name="kanban-square" size="19"></ore-icon>
              ${() => t('nav.pipeline')}
            </ore-sidebar-item>
            <ore-sidebar-item
              href=${routePaths.opportunities}
              data-route="opportunities"
              label=${() => t('nav.opportunities')}
              title=${() => t('nav.opportunities')}>
              <ore-icon slot="icon" name="circle-dollar-sign" size="19"></ore-icon>
              ${() => t('nav.opportunities')}
            </ore-sidebar-item>
            <ore-sidebar-item
              href=${routePaths.leads}
              data-route="leads"
              label=${() => t('nav.leads')}
              title=${() => t('nav.leads')}>
              <ore-icon slot="icon" name="user-plus" size="19"></ore-icon>
              ${() => t('nav.leads')}
            </ore-sidebar-item>
          </ore-sidebar-group>
          <ore-sidebar-group label=${() => t('nav.customers')}>
            <ore-sidebar-item
              href=${routePaths.companies}
              data-route="companies"
              bottom-nav
              bottom-nav-label=${() => t('nav.companies')}
              label=${() => t('nav.companies')}
              title=${() => t('nav.companies')}>
              <ore-icon slot="icon" name="building-2" size="19"></ore-icon>
              ${() => t('nav.companies')}
            </ore-sidebar-item>
            <ore-sidebar-item
              href=${routePaths.contacts}
              data-route="contacts"
              label=${() => t('nav.contacts')}
              title=${() => t('nav.contacts')}>
              <ore-icon slot="icon" name="users" size="19"></ore-icon>
              ${() => t('nav.contacts')}
            </ore-sidebar-item>
          </ore-sidebar-group>
          <ore-sidebar-item
            href=${routePaths.activity}
            data-route="activity"
            bottom-nav
            bottom-nav-label=${() => t('companyDetail.activity')}
            label=${() => t('nav.activity')}
            title=${() => t('nav.activity')}>
            <ore-icon slot="icon" name="activity" size="19"></ore-icon>
            ${() => t('nav.activity')}
          </ore-sidebar-item>
          <div class="sidebar-footer-content" slot="footer">
            <a
              class="pipeline-pulse"
              href=${routePaths.pipeline}
              data-route="pipeline"
              aria-label=${() =>
                `${t('context.pipelinePulse')}: ${formatAmount(String(pipelineValue.value))} ${t('dashboard.openPipeline')}; ${pipelineConfidence.value.toFixed(0)}% ${t('context.forecastConfidence')}; ${pipelineAttention.value} ${t('context.needsAttention')}`}>
              <span class="pipeline-pulse__label">${() => t('context.pipelinePulse')}</span>
              <strong>${() => formatAmount(String(pipelineValue.value))}</strong>
              <small>${() => t('dashboard.openPipeline')}</small>
              <span class="pipeline-pulse__chart" aria-hidden="true">
                ${each(
                  pipelineSegments,
                  (item) => item.stage,
                  (item) => html`
                    <i
                      class=${() => `pipeline-pulse__segment pipeline-pulse__segment--${item.value.stage}`}
                      style=${() => `width:${item.value.share}%`}></i>
                  `,
                )}
              </span>
              <span class="pipeline-pulse__meta">
                <span>${() => `${pipelineConfidence.value.toFixed(0)}% ${t('context.forecastConfidence')}`}</span>
                <span>${() => `${pipelineAttention.value} ${t('context.needsAttention')}`}</span>
              </span>
              <span class="pipeline-pulse__action">
                ${() => t('nav.pipeline')}
                <ore-icon name="arrow-right" size="14"></ore-icon>
              </span>
            </a>
            <span class="sidebar-user-label">${() => t('topbar.demoUser')}</span>
            <div class="sidebar-profile">
              <ore-popover
                class="user-menu"
                placement="top-start"
                trigger="click"
                label=${() => t('topbar.demoUser')}
                ?open=${userMenuOpen}
                @open-change=${(event: CustomEvent<{ open: boolean }>) => {
                  userMenuOpen.value = event.detail.open;
                }}>
                <button
                  class="user-menu__trigger"
                  type="button"
                  aria-label=${() => `${t('topbar.demoUser')}: ${currentUser.value.name}, ${currentUser.value.title}`}>
                  <span class="rail-avatar">${() => initials(currentUser.value.name)}</span>
                  <span class="user-menu__copy">
                    <strong>${() => currentUser.value.name}</strong>
                    <small>${() => currentUser.value.title}</small>
                  </span>
                  <ore-icon class="user-menu__chevrons" name="chevrons-up-down" size="15"></ore-icon>
                </button>
                <div class="user-menu__panel" slot="content">
                  <ore-radio-group
                    name="demo-user"
                    label=${() => t('topbar.demoUser')}
                    color="primary"
                    value=${() => currentUser.value.id}
                    @change=${selectUser}>
                    ${demoUsers.map(
                      (user) => html`
                        <ore-radio value=${user.id}>
                          <span class="user-menu__option">
                            <span class="user-menu__option-avatar">${initials(user.name)}</span>
                            <span class="user-menu__option-copy">
                              <strong>${user.name}</strong>
                              <small>${user.title}</small>
                            </span>
                          </span>
                        </ore-radio>
                      `,
                    )}
                  </ore-radio-group>
                </div>
              </ore-popover>
            </div>
            <div class="sidebar-mobile-controls">
              <span class="sidebar-mobile-controls__label">${() => t('topbar.workspaceControls')}</span>
              <ore-button class="mobile-theme" variant="outline">
                <ore-icon slot="prefix" name="monitor" size="17"></ore-icon>
                ${() => t('topbar.changeTheme')}
              </ore-button>
              <ore-button class="mobile-locale" variant="outline">
                <ore-icon slot="prefix" name="languages" size="17"></ore-icon>
                ${() => t('topbar.changeLanguage')}
              </ore-button>
              <ore-button class="mobile-network" variant="outline">
                <ore-icon slot="prefix" name="wifi" size="17"></ore-icon>
                ${() => t('topbar.toggleNetwork')}
              </ore-button>
              <ore-button variant="outline" @click=${() => navigate('showcase')}>
                <ore-icon slot="prefix" name="blocks" size="17"></ore-icon>
                ${() => t('nav.showcase')}
              </ore-button>
            </div>
          </div>
        </ore-sidebar>

        <div class="signal-workspace">
          <ore-navbar
            class="signal-topbar"
            sticky
            breakpoint="(max-width: 920px)"
            mobile-sidebar="#crm-sidebar"
            label=${() => t('topbar.workspaceControls')}
            menu-open-label=${() => t('topbar.openNavigationMenu')}
            menu-close-label=${() => t('topbar.closeNavigationMenu')}>
            <div class="topbar-leading" slot="logo">
              <div class="topbar-context">${() => t('nav.overview')}</div>
              <button
                class="search-trigger search-trigger--mobile"
                type="button"
                aria-label=${() => t('topbar.commandSearch')}>
                <ore-icon name="search" size="17"></ore-icon>
              </button>
            </div>
            <button class="search-trigger search-trigger--desktop" type="button">
              <ore-icon name="search" size="17"></ore-icon>
              <span>${() => t('topbar.searchPlaceholder')}</span>
              <kbd>⌘ K</kbd>
            </button>
            <div class="topbar-actions" slot="end">
              <div class="presence" aria-label=${presenceLabel} title=${presenceLabel}>
                ${each(
                  presenceUsers,
                  (user) => user.id,
                  (user) => html`
                    <span title=${() => user.value.name}>${() => initials(user.value.name)}</span>
                  `,
                )}
                <b class="presence-count">${() => String(presenceUsers.value.length)}</b>
              </div>
              <button class="status-control" type="button">
                <i></i>
                <span>${() => t('status.online')}</span>
              </button>
              <button
                class="showcase-button icon-button"
                type="button"
                aria-label=${() => t('nav.showcase')}
                title=${() => t('nav.showcase')}
                @click=${() => navigate('showcase')}>
                <ore-icon name="blocks" size="17"></ore-icon>
              </button>
              <button class="theme-button icon-button" type="button" aria-label=${() => t('topbar.changeTheme')}>
                <ore-icon name="monitor" size="17"></ore-icon>
              </button>
              <button class="locale-button" type="button">EN</button>
            </div>
          </ore-navbar>
          <main id="crm-main" class="signal-main" tabindex="-1">
            <section class="route-status" aria-live="polite" ?hidden=${() => routeState.value === 'ready'}>
              <p>${() => t(routeState.value === 'error' ? 'common.routeLoadFailed' : 'common.loading')}</p>
              ${when(
                () => routeState.value === 'error',
                () => html`
                  <button type="button" @click=${() => retryView()}>${() => t('action.retry')}</button>
                `,
              )}
            </section>
            <div class="route-view"></div>
          </main>
        </div>
      </ore-grid>
      <ore-command-palette
        label=${() => t('topbar.commandSearch')}
        placeholder=${() => t('topbar.commandPlaceholder')}
        no-filter
        ?open=${paletteOpen}
        @open-change=${(event: CustomEvent<{ open: boolean }>) => {
          paletteOpen.value = event.detail.open;
        }}></ore-command-palette>
      <crm-record-dialog></crm-record-dialog>
      <crm-record-drawer></crm-record-drawer>
    `;
  },
  shadow: false,
});

export function createAppShell(): HTMLElement {
  return document.createElement('crm-app-shell');
}
