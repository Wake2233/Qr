import { consoleNavItems } from '@cp/core';
import { render, screen } from '@testing-library/react';

import { ConsoleSidebar } from './console-sidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/inventory' }));

describe('ConsoleSidebar', () => {
  it('shows staff the workspace only and marks the current section', () => {
    render(<ConsoleSidebar items={consoleNavItems({ role: 'dealer', memberships: ['staff'] })} />);
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inventory' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('adds the admin group with links for admins', () => {
    render(<ConsoleSidebar items={consoleNavItems({ role: 'admin', memberships: [] })} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dealers' })).toHaveAttribute(
      'href',
      '/dashboard/dealers',
    );
  });
});
