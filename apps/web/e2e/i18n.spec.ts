import { expect, test } from '@playwright/test';

import { anonApi } from './support';

test('switch to Georgian → filters and car page in Georgian → back to English', async ({
  page,
}) => {
  const { data: target } = await anonApi()
    .from('vehicle_cards')
    .select('slug, body_type, price_cents')
    .in('status', ['active'])
    .eq('dealer_status', 'approved')
    .eq('body_type', 'suv')
    .order('published_at', { ascending: false })
    .limit(1)
    .single();
  if (!target?.slug) throw new Error('seed has no live SUV (run pnpm db:seed)');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  // The header button switches language and remembers it.
  await page.getByRole('button', { name: 'ქართული' }).click();
  await expect(page).toHaveURL(/\/ka$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'იპოვე მანქანა, რომლის მართვაც გესიამოვნება.',
  );
  // A plain URL now lands on the Georgian page.
  await page.goto('/contact');
  await expect(page).toHaveURL(/\/ka\/contact$/);

  // Filters keep the /ka prefix; chips and labels are Georgian.
  await page.goto('/ka/inventory?body=suv');
  await expect(page.getByRole('button', { name: 'ფილტრის მოხსნა: ჯიპი (SUV)' })).toBeVisible();

  // The car page: Georgian specs, the same WhatsApp link.
  await page.goto(`/ka/inventory/${target.slug}`);
  await expect(page.getByRole('heading', { name: 'მიმოხილვა' })).toBeVisible();
  await expect(page.locator('[data-spec="body_type"]')).toHaveText('ჯიპი (SUV)');
  const wa = page.getByTestId('cta-whatsapp').filter({ visible: true });
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=/);

  // Back to English on the same page.
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page).toHaveURL(new RegExp(`/inventory/${target.slug}$`));
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
});

test('the console and sign-in stay English', async ({ page }) => {
  await page.goto('/ka/login');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
