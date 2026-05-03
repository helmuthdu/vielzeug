export const dataLoggingExample = {
  code: "import { Logit } from '@vielzeug/logit'\n\nconst user = {\n  id: 1,\n  name: 'Alice',\n  email: 'alice@example.com',\n  metadata: {\n    role: 'admin',\n    lastLogin: new Date()\n  }\n}\n\nLogit.info('User object:', user)\n\nconst array = [1, 2, 3, 4, 5]\nLogit.debug('Array data:', array)\n\nLogit.table({ Name: 'Alice', Age: 30, Role: 'Admin' })\n\nconsole.log('Check browser console for formatted data!')",
  name: 'Logging Objects and Data',
};
