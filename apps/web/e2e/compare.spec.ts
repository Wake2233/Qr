import { expect, test } from '@playwright/test';

test('add 3 vehicles → /compare shows 3 columns with differences highlighted', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/inventory?sort=price_desc');
  const cards = page.locator('main ul.grid:visible').first().locator('article');
  await expect(cards.first()).toBeVisible();

  const titles: string[] = [];
  for (let i = 0; i < 3; i++) {
    const card = cards.nth(i);
    titles.push((await card.locator('h3').textContent()) ?? '');
    await card.getByRole('button', { name: /to compare$/ }).click();
    await expect(card.getByRole('button', { name: /from compare$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }

  const tray = page.getByRole('complementary', { name: 'Compare tray' });
  await expect(tray.getByRole('listitem')).toHaveCount(3);
  await tray.getByRole('link', { name: 'Compare (3)' }).click();
  await expect(page).toHaveURL(/\/compare\?ids=[0-9a-f-]+,[0-9a-f-]+,[0-9a-f-]+$/);
  await expect(tray).toBeHidden();

  const table = page.getByRole('table');
  const headers = table.locator('thead th[scope="col"]');
  await expect(headers).toHaveCount(4); // label column + 3 vehicles
  for (const title of titles) await expect(table.locator('thead')).toContainText(title);

  const differing = table.locator('tbody tr[data-differs]');
  expect(await differing.count()).toBeGreaterThan(0);
  await expect(differing.first()).toHaveClass(/bg-primary/);
  await expect(table.getByRole('rowheader', { name: 'Mileage' })).toBeVisible();

  // Hide identical rows: every remaining spec row differs.
  const specRows = table.locator('tbody tr:not(:has(th[scope="colgroup"]))');
  const allRows = await specRows.count();
  await page.getByRole('switch').click();
  await expect.poll(() => specRows.count()).toBeLessThan(allRows);
  expect(await specRows.count()).toBe(await table.locator('tbody tr[data-differs]').count());

  // The link is shareable: a fresh visitor sees the same three columns.
  const url = page.url();
  const visitor = await browser.newPage();
  await visitor.goto(url);
  await expect(visitor.getByRole('table').locator('thead th[scope="col"]')).toHaveCount(4);
  await visitor.close();

  // Removing a column updates the URL.
  await table.getByRole('button', { name: `Remove ${titles[0]}`, exact: false }).click();
  await expect(headers).toHaveCount(3);
  await expect(page).toHaveURL(/\/compare\?ids=[0-9a-f-]+,[0-9a-f-]+$/);
});
