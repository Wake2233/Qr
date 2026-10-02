import { render, screen } from '@testing-library/react';

import { PriceTag } from './price-tag';

describe('PriceTag', () => {
  it('renders cents through the shared @cp/core formatter', () => {
    render(<PriceTag cents={4_599_000} />);
    expect(screen.getByText('$45,990')).toBeInTheDocument();
  });
});
