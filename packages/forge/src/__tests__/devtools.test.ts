import { vi } from 'vitest';

import { debugForm } from '../devtools';
import { createForm, ForgeDisposedError } from '../index';

describe('debugForm', () => {
  test('logs public state transitions and detaches cleanly', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const form = createForm({ initialValues: { email: '' } });
    const stop = debugForm(form, { label: 'signup' });

    const submission = form.submit(async () => undefined);

    await submission;
    stop();

    expect(debug).toHaveBeenCalledWith('[forge:devtools:signup] submitting:', true);
    expect(debug).toHaveBeenCalledWith('[forge:devtools:signup] submitting:', false);

    debug.mockRestore();
  });

  test('rejects attaching to a disposed form', () => {
    const form = createForm({ initialValues: { email: '' } });

    form.dispose();

    expect(() => debugForm(form)).toThrow(ForgeDisposedError);
  });
});
