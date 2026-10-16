import { listHomeBoard, setHomeOrder } from '@cp/api';
import { expect, test } from '@playwright/test';

import { apiAs, signIn } from './support';

test.describe('home page order', () => {
  let original: string[] = [];

  test.beforeAll(async () => {
    const admin = await apiAs('admin@test.local');
    original = (await listHomeBoard(admin)).pinned.map((card) => card.id);
  });

  test.afterAll(async () => {
    // Leave the seed's pins as they were for the other specs.
    await setHomeOrder(await apiAs('admin@test.local'), original);
  });

  test('admin pins a car to #1 → it is the home spotlight', async ({ page }) => {
    const admin = await apiAs('admin@test.local');
    const { others } = await listHomeBoard(admin);
    const target = others[0];
    if (!target) throw new Error('seed has no unpinned live vehicle (run pnpm db:seed)');
    await setHomeOrder(admin, []); // start with nothing pinned

    await signIn(page, 'admin@test.local', '/dashboard/home');
    await expect(page.getByRole('heading', { name: 'Home page', level: 1 })).toBeVisible();
    await page
      .getByRole('searchbox', { name: 'Search cars to pin' })
      .fill(target.stock_number ?? target.title);
    await page
      .getByRole('listitem')
      .filter({ hasText: target.title })
      .getByRole('button', { name: 'Pin' })
      .first()
      .click();
    await expect(page.getByText(`${target.title} pinned`)).toBeVisible();
    await expect(page.getByText('Spotlight', { exact: true })).toBeVisible();

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Find the car/ })).toBeVisible();
    const spotlight = page.locator('section[aria-labelledby="spotlight-title"]');
    await expect(spotlight.getByText('Our pick')).toBeVisible();
    await expect(spotlight.getByRole('heading', { level: 2 })).toHaveText(
      `${target.year} ${target.make_name} ${target.model_name}`,
    );
    await expect(page.getByRole('heading', { name: 'In stock now' })).toBeVisible();
  });
});
