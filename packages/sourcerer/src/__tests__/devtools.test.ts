import { debugSource } from '../devtools';
import { createLocalSource } from '../localSource';

describe('debugSource', () => {
  it('observes snapshot transitions until detached', () => {
    const source = createLocalSource([1, 2, 3], { initialQuery: { pageSize: 1 } });
    const log = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const detach = debugSource(source, { label: 'numbers' });

    source.setQuery({ pageSize: 2 });
    detach();
    source.setQuery({ pageSize: 3 });

    expect(log).toHaveBeenCalledWith('[@vielzeug/sourcerer:numbers] data:', 1, '→', 2, 'items');
    log.mockRestore();
  });
});
