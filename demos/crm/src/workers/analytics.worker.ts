import { exposeTask } from '@vielzeug/familiar/protocol';
import type { Contact } from '../core/types';

exposeTask((contacts: Contact[]) =>
  contacts.reduce<Record<string, number>>((counts, contact) => {
    counts[contact.title] = (counts[contact.title] ?? 0) + 1;
    return counts;
  }, {}),
);
