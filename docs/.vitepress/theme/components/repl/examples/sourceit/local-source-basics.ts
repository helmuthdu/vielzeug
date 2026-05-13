export const localSourceBasicsExample = {
  code: "import { createLocalSource, filterContains, sortBy } from '@vielzeug/sourceit'\n\nconst users = [\n  { id: 1, name: 'Ada Lovelace', role: 'admin' },\n  { id: 2, name: 'Grace Hopper', role: 'admin' },\n  { id: 3, name: 'Linus Torvalds', role: 'member' },\n  { id: 4, name: 'Margaret Hamilton', role: 'member' },\n]\n\nconst source = createLocalSource(users, { limit: 2 })\n\nsource.setFilter(filterContains((u) => u.name, 'a'))\nsource.setSort(sortBy((u) => u.name, 'asc'))\n\nconsole.log('Page 1:', source.current)\nconsole.log('Meta:', source.meta)\n\nsource.next()\nconsole.log('Page 2:', source.current)\n\nconst query = source.toQueryParams()\nconsole.log('Query params:', query)",
  name: 'Local Source Basics',
};
