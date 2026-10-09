import { expect, test } from '@playwright/test';

import { apiAs, signIn } from './support';

test('favorites saved while signed out move into the account on sign-in', async ({ page }) => {
  const buyer = await apiAs('buyer@test.local');
  const { data: me } = await buyer.auth.getUser();
  const userId = me.user?.id ?? '';
  await buyer.from('favorites').delete().eq('user_id', userId);

  await page.goto('/inventory');
  const cards = page.locator('main ul.grid:visible').first().locator('article');
  const titles: string[] = [];
  for (let i = 0; i < 2; i++) {
    const card = cards.nth(i);
    titles.push((await card.locator('h3').textContent()) ?? '');
    await card.getByRole('button', { name: /^Save / }).click();
    await expect(card.getByRole('button', { name: /from saved$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }

  await page.goto('/account/favorites');
  await expect(page.getByText('Saved on this device only.')).toBeVisible();
  for (const title of titles) await expect(page.getByRole('main')).toContainText(title);

  await signIn(page, 'buyer@test.local', '/account/favorites');
  await expect(page.getByText(/saved vehicles are now in your account/)).toBeVisible();
  await expect(page.getByText('Saved on this device only.')).toBeHidden();
  for (const title of titles) await expect(page.getByRole('main')).toContainText(title);

  await expect
    .poll(
      async () =>
        (await buyer.from('favorites').select('vehicle_id').eq('user_id', userId)).data?.length,
    )
    .toBe(2);
  expect(await page.evaluate(() => localStorage.getItem('cp-favorites'))).toContain('"ids":[]');

  await buyer.from('favorites').delete().eq('user_id', userId);
});
