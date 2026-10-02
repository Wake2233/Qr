import { render, screen } from '@testing-library/react-native';

import { PriceTag } from './price-tag';

describe('PriceTag', () => {
  it('renders cents through the shared @cp/core formatter', async () => {
    await render(<PriceTag cents={4_599_000} />);
    expect(screen.getByText('$45,990')).toBeTruthy();
  });
});
