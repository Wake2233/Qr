import { expect, test } from '@playwright/test';

import { anonApi, apiAs, pngFixture, selectOption, signIn } from './support';

/**
 * Phase 4 DoD: a dealer creates a listing, uploads 3 photos, publishes it, and buyers can see it.
 * Also: another dealer can't open it in the console by editing the URL.
 */
test.describe('dealer inventory', () => {
  const stock = `E2E-${Date.now().toString(36).toUpperCase()}`;
  let vehicleId: string | undefined;

  test.afterAll(async () => {
    if (!vehicleId) return;
    const admin = await apiAs('admin@test.local');
    const { data: images } = await admin
      .from('vehicle_images')
      .select('storage_path')
      .eq('vehicle_id', vehicleId);
    await admin.from('vehicles').delete().eq('id', vehicleId);
    if (images?.length)
      await admin.storage.from('vehicle-images').remove(images.map((i) => i.storage_path));
  });

  test('create → upload 3 photos → publish → visible publicly', async ({ page }) => {
    await signIn(page, 'dealer.owner@test.local', '/dashboard/inventory/new');
    await expect(page.getByRole('heading', { name: 'Add vehicle' })).toBeVisible();

    await selectOption(page, 'Year', '2022');
    await selectOption(page, 'Make', 'Toyota');
    await selectOption(page, 'Model', 'Camry');
    await page.getByLabel('Trim').fill('XSE');
    await page.getByLabel('Stock number').fill(stock);
    await page.getByLabel(/^Price/).fill('28,450');
    await page.getByLabel(/^Mileage/).fill('21500');
    await selectOption(page, 'Fuel type', 'Gasoline');
    await selectOption(page, 'Transmission', 'Automatic');
    await selectOption(page, 'Drivetrain', 'Front-wheel drive (FWD)');
    await selectOption(page, 'Body style', 'Sedan');
    await page.getByLabel(/^Exterior color/).fill('Celestial Silver');

    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.waitForURL(/\/dashboard\/inventory\/[0-9a-f-]{36}/);
    vehicleId = /inventory\/([0-9a-f-]{36})/.exec(page.url())?.[1];
    await expect(page.getByRole('heading', { name: '2022 Toyota Camry XSE' })).toBeVisible();

    // The publish gate needs photos first.
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByText('Add at least one photo').first()).toBeVisible();

    const files = await Promise.all([
      pngFixture(page, '#b91c1c', 'front'),
      pngFixture(page, '#1d4ed8', 'side'),
      pngFixture(page, '#15803d', 'rear'),
    ]);
    await page.locator('#photos input[type=file]').setInputFiles(files);
    await expect(page.getByText('3 photos added')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: /^Reorder / })).toHaveCount(3);

    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByText('Published. Buyers can see it now.')).toBeVisible();

    const { data: card } = await anonApi()
      .from('vehicle_cards')
      .select('status, price_cents, image_count, cover_width')
      .eq('stock_number', stock)
      .single();
    expect(card).toEqual({
      status: 'active',
      price_cents: 2_845_000,
      image_count: 3,
      cover_width: 1600,
    });
  });

  test("another dealer can't open the listing in the console", async ({ page }) => {
    test.skip(!vehicleId, 'depends on the listing created above');
    await signIn(page, 'dealer2.owner@test.local', '/dashboard');
    await page.goto(`/dashboard/inventory/${vehicleId}`);
    await expect(page.getByRole('heading', { name: 'Section not found' })).toBeVisible();

    // And the database refuses edits regardless of the UI.
    const other = await apiAs('dealer2.owner@test.local');
    const { data } = await other
      .from('vehicles')
      .update({ price_cents: 100 })
      .eq('id', vehicleId ?? '')
      .select('id');
    expect(data).toEqual([]);
  });
});
