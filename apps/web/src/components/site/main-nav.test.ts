import { isActivePath } from './main-nav';

describe('isActivePath', () => {
  it('matches the section and its children only', () => {
    expect(isActivePath('/inventory', '/inventory')).toBe(true);
    expect(isActivePath('/inventory/2021-bmw-x5-1a2b3c4d', '/inventory')).toBe(true);
    expect(isActivePath('/inventory-deals', '/inventory')).toBe(false);
    expect(isActivePath('/', '/inventory')).toBe(false);
  });
});
