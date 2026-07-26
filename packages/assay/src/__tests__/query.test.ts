import {
  getSlotted,
  query,
  queryAll,
  queryAllByTestId,
  queryAllByText,
  queryAllInShadow,
  queryByTestId,
  queryByText,
  queryInShadow,
  queryPart,
  within,
} from '../query';

describe('within()', () => {
  it('scopes query/queryAll to the given element', () => {
    const root = document.createElement('div');

    root.innerHTML = '<p class="a">First</p><p class="a">Second</p>';

    const { query, queryAll } = within(root);

    expect(query('.a')?.textContent).toBe('First');
    expect(queryAll('.a')).toHaveLength(2);
  });

  it('scopes queryByText/queryAllByText/queryByTestId/queryAllByTestId to the given element', () => {
    const root = document.createElement('div');

    root.innerHTML = `
      <span data-testid="label">Hello</span>
      <span data-testid="other">World</span>
      <p>Hello</p>
    `;

    const { queryAllByTestId, queryAllByText, queryByTestId, queryByText } = within(root);

    expect(queryByTestId('label')?.textContent).toBe('Hello');
    expect(queryAllByTestId('label')).toHaveLength(1);
    expect(queryByText('Hello')?.tagName).toBe('SPAN');
    expect(queryAllByText('Hello')).toHaveLength(2);
  });
});

describe('query() / queryAll() / queryByTestId() / queryAllByTestId()', () => {
  it("mirror within()'s scoped methods as free functions, for callers that already have a root", () => {
    const root = document.createElement('div');

    root.innerHTML = '<p class="a">First</p><p class="a">Second</p><span data-testid="x">X</span>';

    expect(query(root, '.a')?.textContent).toBe('First');
    expect(queryAll(root, '.a')).toHaveLength(2);
    expect(queryByTestId(root, 'x')?.textContent).toBe('X');
    expect(queryAllByTestId(root, 'x')).toHaveLength(1);
  });

  it('work against a ShadowRoot directly, not just Element', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = '<span data-testid="x">Shadowed</span>';

    expect(query(shadow, '[data-testid="x"]')).not.toBeNull();
    expect(queryByTestId(shadow, 'x')?.textContent).toBe('Shadowed');
  });
});

describe('queryByText() / queryAllByText()', () => {
  it('matches trimmed text content exactly', () => {
    const root = document.createElement('div');

    root.innerHTML = '<span>  Hello  </span><span>Goodbye</span>';

    expect(queryByText(root, 'Hello', 'span')?.textContent?.trim()).toBe('Hello');
    expect(queryByText(root, 'Nope', 'span')).toBeNull();
  });

  it('returns every matching element for queryAllByText', () => {
    const root = document.createElement('div');

    root.innerHTML = '<li>A</li><li>B</li><li>A</li>';

    expect(queryAllByText<HTMLLIElement>(root, 'A', 'li')).toHaveLength(2);
  });

  it('works against a ShadowRoot directly, not just Element', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = '<span>Shadowed</span>';

    expect(queryByText(shadow, 'Shadowed', 'span')).not.toBeNull();
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

  it('returns null/empty for an element with no shadow root, instead of throwing', () => {
    const host = document.createElement('div');

    expect(queryInShadow(host, '.a')).toBeNull();
    expect(queryAllInShadow(host, '.a')).toEqual([]);
  });

  it('queryPart() matches a [part] attribute', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = '<button part="prev-btn">Prev</button>';

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

    host.innerHTML = '<span slot="header">Header</span><span>Default 1</span><span>Default 2</span>';

    expect(getSlotted(host)).toHaveLength(2);
  });
});
