export const arraySearchExample = {
  code: "import { search } from '@vielzeug/toolkit'\n\nconst users = [\n  { name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },\n  { name: 'Bob Smith', email: 'bob@example.com', role: 'user' },\n  { name: 'Charlie Brown', email: 'charlie@example.com', role: 'user' },\n  { name: 'David Miller', email: 'david@example.com', role: 'moderator' }\n]\n\nconst results1 = search(users, 'alice')\nconsole.log('Search \"alice\":', results1)\n\nconst results2 = search(users, 'smith')\nconsole.log('Search \"smith\":', results2)\n\nconst results3 = search(users, 'admin')\nconsole.log('Search \"admin\":', results3)",
  name: 'search - Fuzzy search in arrays',
};
