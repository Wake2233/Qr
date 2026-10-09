import { render, screen } from '@testing-library/react';

import { BusinessHours, formatHoursRange } from './business-hours';

describe('formatHoursRange', () => {
  it.each([
    ['09:00-19:00', '9 AM – 7 PM'],
    ['10:30-17:45', '10:30 AM – 5:45 PM'],
    ['00:00-12:00', '12 AM – 12 PM'],
  ])('%s → %s', (range, expected) => {
    expect(formatHoursRange(range)).toBe(expected);
  });
});

describe('BusinessHours', () => {
  it('lists days in week order and marks closed days', () => {
    render(<BusinessHours hours={{ sun: null, mon: '09:00-19:00' }} />);
    const terms = screen.getAllByRole('term').map((el) => el.textContent);
    expect(terms).toEqual(['Monday', 'Sunday']);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('renders nothing without hours', () => {
    const { container } = render(<BusinessHours hours={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
