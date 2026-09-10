export type ShowcaseDemoId = 'voyage' | 'eshop' | 'crm';

type ShowcaseFeature = {
  description: string;
  icon: string;
  title: string;
};

type ShowcasePackage = {
  name: string;
  purpose: string;
};

export type ShowcaseDemo = {
  category: string;
  detailAlt: string;
  detailImage: string;
  features: ShowcaseFeature[];
  headline: string;
  homeAlt: string;
  homeImage: string;
  href: string;
  icon: string;
  id: ShowcaseDemoId;
  imageHeight: number;
  imageWidth: number;
  name: string;
  packages: ShowcasePackage[];
  source: string;
  summary: string;
};

export const SHOWCASE_DEMOS: ShowcaseDemo[] = [
  {
    category: 'Travel planning',
    detailAlt: 'Voyage Japan itinerary with route map, reservations, dates, and trip statistics',
    detailImage: 'ss_voyage_trip',
    features: [
      {
        description: 'Explore Tokyo, Kyoto, and Osaka through an interactive route.',
        icon: 'map',
        title: 'Spatial planning',
      },
      {
        description: 'Shape a chronological plan with distinct travel activity types.',
        icon: 'calendar-days',
        title: 'Day-by-day itinerary',
      },
      {
        description: 'Move from room selection through guest details to confirmation.',
        icon: 'ticket-check',
        title: 'Connected booking',
      },
      {
        description: 'Travel-first layouts remain focused and touch-friendly on mobile.',
        icon: 'smartphone',
        title: 'Responsive journey',
      },
    ],
    headline: 'Every moment, beautifully mapped.',
    homeAlt: 'Voyage destination discovery page with a Tokyo hero and travel search controls',
    homeImage: 'ss_voyage_explore',
    href: '/demos/voyage/',
    icon: 'map-pinned',
    id: 'voyage',
    imageHeight: 900,
    imageWidth: 1440,
    name: 'Voyage',
    packages: [
      { name: 'refine', purpose: 'Accessible UI' },
      { name: 'wayfinder', purpose: 'Application routing' },
      { name: 'ripple', purpose: 'Reactive state' },
      { name: 'illusionist', purpose: 'Deterministic demo data' },
      { name: 'ore', purpose: 'Declarative views' },
    ],
    source: 'https://github.com/helmuthdu/vielzeug/tree/main/demos/voyage',
    summary: 'Destination discovery, booking, route planning, and a day-by-day Japan itinerary.',
  },
  {
    category: 'Consumer shopping',
    detailAlt: 'E-commerce vehicle detail page with configuration choices, product imagery, and pricing',
    detailImage: 'ss_eshop_model_detail',
    features: [
      {
        description: 'Search, sort, and quick filters keep the catalogue approachable.',
        icon: 'search',
        title: 'Product discovery',
      },
      {
        description: 'Explore paint, wheels, trim, and pricing in context.',
        icon: 'sliders-horizontal',
        title: 'Configuration',
      },
      { description: 'Move from browsing through cart and checkout.', icon: 'shopping-cart', title: 'Shopping flow' },
      {
        description: 'Consumer navigation and product detail adapt across viewports.',
        icon: 'scan',
        title: 'Responsive hierarchy',
      },
    ],
    headline: 'Discovery designed to convert.',
    homeAlt: 'Automotive storefront with featured vehicles, search, filters, and shopping navigation',
    homeImage: 'ss_eshop_home',
    href: '/demos/eshop/',
    icon: 'shopping-bag',
    id: 'eshop',
    imageHeight: 900,
    imageWidth: 1440,
    name: 'E-commerce',
    packages: [
      { name: 'refine', purpose: 'Accessible UI' },
      { name: 'forge', purpose: 'Form state' },
      { name: 'coins', purpose: 'Precise pricing' },
      { name: 'scout', purpose: 'Product search' },
      { name: 'wayfinder', purpose: 'Application routing' },
      { name: 'vault', purpose: 'Browser persistence' },
    ],
    source: 'https://github.com/helmuthdu/vielzeug/tree/main/demos/eshop',
    summary: 'Automotive discovery, comparison, configuration, cart, and checkout in one responsive flow.',
  },
  {
    category: 'Customer management',
    detailAlt: 'CRM sales pipeline with opportunity columns, filtering, forecasts, and customer records',
    detailImage: 'ss_crm_pipeline',
    features: [
      {
        description: 'Forecasts and action signals surface the state of the business.',
        icon: 'chart-no-axes-combined',
        title: 'Revenue dashboards',
      },
      {
        description: 'Sortable opportunity data stays structured and scannable.',
        icon: 'table-2',
        title: 'Data workflows',
      },
      { description: 'Deals move through validated, reversible stages.', icon: 'kanban', title: 'Pipeline management' },
      { description: 'Customers, deals, and actions remain quick to reach.', icon: 'search', title: 'Global search' },
    ],
    headline: 'Every relationship, in view.',
    homeAlt: 'CRM dashboard with revenue metrics, forecast chart, activity, and customer opportunities',
    homeImage: 'ss_crm_home',
    href: '/demos/crm/',
    icon: 'users-round',
    id: 'crm',
    imageHeight: 900,
    imageWidth: 1440,
    name: 'CRM',
    packages: [
      { name: 'refine', purpose: 'Accessible UI' },
      { name: 'prism', purpose: 'Revenue charts' },
      { name: 'courier', purpose: 'Data fetching' },
      { name: 'forge', purpose: 'Form state' },
      { name: 'ward', purpose: 'Role-based access' },
      { name: 'ledger', purpose: 'Reversible changes' },
    ],
    source: 'https://github.com/helmuthdu/vielzeug/tree/main/demos/crm',
    summary: 'Revenue dashboards, opportunities, customer context, filtering, and business workflows.',
  },
];

export const showcaseDemoById = (id: string): ShowcaseDemo | undefined => SHOWCASE_DEMOS.find((demo) => demo.id === id);
