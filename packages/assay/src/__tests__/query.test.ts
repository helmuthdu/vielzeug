import { AssayQueryError, getSlotted, queryAllInShadow, queryInShadow, queryPart, within } from '../index';

describe('within()', () => {
  it('scopes nullable queries to the given element', () => {
    const root = document.createElement('div');

    root.innerHTML = '<p class="a">First</p><p class="a">Second</p>';

    const view = within(root);

    expect(view.query('.a')?.textContent).toBe('First');
    expect(view.queryAll('.a')).toHaveLength(2);
  });

  it('supports nullable and required text/test-id queries', () => {
    const root = document.createElement('div');

    root.innerHTML = `
      <span data-testid="label">Hello</span>
      <span data-testid="other">World</span>
      <p>Hello</p>
    `;

    const view = within(root);

    expect(view.queryByTestId('label')?.textContent).toBe('Hello');
    expect(view.getByTestId('label').textContent).toBe('Hello');
    expect(view.queryAllByTestId('label')).toHaveLength(1);
    expect(view.queryByText('Hello')?.tagName).toBe('SPAN');
    expect(view.getByText('Hello').tagName).toBe('SPAN');
    expect(view.queryAllByText('Hello')).toHaveLength(2);
  });

  it('scopes queries to a ShadowRoot', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = '<span data-testid="x">Shadowed</span>';

    expect(within(shadow).getByTestId('x').textContent).toBe('Shadowed');
  });

  it('reports the query and scoped markup when a required match is absent', () => {
    const root = document.createElement('div');

    root.innerHTML = '<span>Visible</span>';

    expect(() => within(root).get('.missing')).toThrow(AssayQueryError);
    expect(() => within(root).get('.missing')).toThrow('<span>Visible</span>');
  });
});

describe('queryInShadow() / queryAllInShadow() / queryPart()', () => {
  it('queries inside a shadow root', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = '<button class="a">One</button><button class="a">Two</button>';

    expect(queryInShadow(host, '.a')?.textContent).toBe('One');
    expect(queryAllInShadow(host, '.a')).toHaveLength(2);
  });

  it('returns null/empty for an element with no shadow root', () => {
    const host = document.createElement('div');

    expect(queryInShadow(host, '.a')).toBeNull();
    expect(queryAllInShadow(host, '.a')).toEqual([]);
  });

  it('queryPart() matches a part token', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = '<button part="icon prev-btn">Prev</button>';

    expect(queryPart(host, 'prev-btn')?.textContent).toBe('Prev');
    expect(queryPart(host, 'missing')).toBeNull();
  });
});

describe('getSlotted()', () => {
  it('returns light-DOM children assigned to a named slot', () => {
    const host = document.createElement('div');

    host.innerHTML = '<span slot="header">Header</span><span>Default 1</span><span>Default 2</span>';

    expect(getSlotted(host, 'header')).toHaveLength(1);
    expect(getSlotted(host, 'header')[0]?.textContent).toBe('Header');
  });

  it('returns unnamed-slot children when no slot name is given', () => {
    const host = document.createElement('div');

    host.innerHTML = '<span slot="header">Header</span><span>Default 1</span><span slot="">Default 2</span>';

    expect(getSlotted(host)).toHaveLength(2);
  });

  it('handles selector characters in test IDs and slots without building selectors', () => {
    const host = document.createElement('div');

    host.innerHTML = '<span data-testid="quote&quot;value"></span><span slot="quote&quot;value"></span>';

    expect(within(host).getByTestId('quote"value')).toBeInstanceOf(HTMLSpanElement);
    expect(getSlotted(host, 'quote"value')).toHaveLength(1);
  });
});
