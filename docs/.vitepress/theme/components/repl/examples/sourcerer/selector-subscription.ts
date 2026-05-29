export const selectorSubscriptionExample = {
  code: "import { createLocalSource, subscribeSelector } from '/sourcerer'\n\nconst source = createLocalSource([\n  { id: 1, label: 'Alpha' },\n  { id: 2, label: 'Beta' },\n  { id: 3, label: 'Gamma' },\n  { id: 4, label: 'Delta' },\n], { limit: 2 })\n\nconst stop = subscribeSelector(\n  source,\n  (s) => s.meta.pageNumber,\n  (next, prev) => console.log('Page changed:', prev, '->', next),\n)\n\nsource.next()\nsource.next()\nsource.prev()\n\nstop()\nsource.next() // no selector callback now\n\nconsole.log('Current page:', source.meta.pageNumber)",
  name: 'Selector Subscription',
};
