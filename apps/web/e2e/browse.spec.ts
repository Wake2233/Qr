import { expect, test } from '@playwright/test';

import { anonApi, apiAs } from './support';

const usd = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);

const FUEL_LABELS: Record<string, string> = {
  gasoline: 'Gasoline',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  plug_in_hybrid: 'Plug-in hybrid',
  electric: 'Electric',
  flex_fuel: 'Flex fuel',
};

test('filter by make + fuel → VDP → WhatsApp and Call links carry the exact listing', async ({
  page,
  context,
}) => {
  // A live listing (with a stock number) to aim the filters at.
  const { data: target } = await anonApi()
    .from('vehicle_cards')
    .select('id, slug, make_name, make_slug, fuel_type, price_cents, stock_number, dealer_id')
    .in('status', ['active', 'reserved'])
    .eq('dealer_status', 'approved')
    .not('stock_number', 'is', null)
    .not('fuel_type', 'is', null)
    .order('published_at', { ascending: false })
    .limit(1)
    .single();
  if (!target?.make_name || !target.fuel_type || !target.price_cents || !target.stock_number) {
    throw new Error('seed has no suitable live vehicle (run pnpm db:seed)');
  }
  const { data: dealer } = await anonApi()
    .from('dealers')
    .select('whatsapp_e164, phone_e164')
    .eq('id', target.dealer_id ?? '')
    .single();
  const { data: settings } = await anonApi()
    .from('site_settings')
    .select('default_whatsapp_e164, default_phone_e164')
    .single();
  const whatsapp = dealer?.whatsapp_e164 ?? settings?.default_whatsapp_e164 ?? '';
  const phone = dealer?.phone_e164 ?? settings?.default_phone_e164 ?? '';

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/inventory');
  const rail = page.getByRole('complementary', { name: 'Filters' });
  await rail.getByText(target.make_name, { exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`make=${target.make_slug}`));
  await rail.getByText(FUEL_LABELS[target.fuel_type] ?? target.fuel_type, { exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`fuel=${target.fuel_type}`));
  await expect(
    page.getByRole('button', { name: `Remove filter: ${target.make_name}` }),
  ).toBeVisible();

  // Every result matches both filters; open the target listing.
  const grid = page.locator('main ul.grid:visible').first();
  await expect(grid.locator('article').first()).toBeVisible();
  for (const title of await grid.locator('article h3').allTextContents()) {
    expect(title).toContain(target.make_name);
  }
  await grid.locator(`a[href="/inventory/${target.slug}"]`).click();
  await expect(page).toHaveURL(`/inventory/${target.slug}`);
  await expect(page.getByTestId('vdp-price')).toHaveText(usd(target.price_cents));

  // The desktop CTA card (the bottom bar is hidden at this width).
  const wa = page.getByTestId('cta-whatsapp').filter({ visible: true });
  await expect(wa).toHaveCount(1);
  const href = (await wa.getAttribute('href')) ?? '';
  expect(href.startsWith(`https://wa.me/${whatsapp.slice(1)}?text=`)).toBe(true);
  const text = new URL(href).searchParams.get('text') ?? '';
  expect(text).toContain(usd(target.price_cents));
  expect(text).toContain(`Stock #${target.stock_number}`);
  expect(text).toContain(`/inventory/${target.slug}`);
  await expect(page.getByTestId('cta-call').filter({ visible: true })).toHaveAttribute(
    'href',
    `tel:${phone}`,
  );

  // The tap is logged (fire-and-forget) and WhatsApp opens in a new tab.
  const admin = await apiAs('admin@test.local');
  const countClicks = async () =>
    (
      await admin
        .from('contact_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('vehicle_id', target.id ?? '')
        .eq('channel', 'whatsapp')
    ).count ?? 0;
  const before = await countClicks();
  await context.route('https://wa.me/**', (route) => route.fulfill({ body: 'WhatsApp' }));
  const [popup] = await Promise.all([context.waitForEvent('page'), wa.click()]);
  await popup.close();
  await expect.poll(countClicks).toBe(before + 1);
});

test('search as you type, then infinite scroll to the end', async ({ page }) => {
  const { count } = await anonApi()
    .from('vehicle_cards')
    .select('id', { count: 'exact', head: true })
    .in('status', ['active', 'reserved'])
    .eq('dealer_status', 'approved');
  const total = count ?? 0;
  expect(total).toBeGreaterThan(24); // more than one page

  await page.goto('/inventory');
  await page.getByRole('searchbox', { name: 'Search inventory' }).fill('f15');
  await expect(page).toHaveURL(/q=f15/);
  const titles = page.locator('main ul.grid:visible').first().locator('article h3');
  await expect(titles.first()).toContainText('F-150');
  for (const title of await titles.allTextContents()) expect(title).toContain('F-150');

  // Back returns to the unfiltered list (the first keystroke pushed a history entry).
  await page.goBack();
  await expect(page).toHaveURL(/\/inventory$/);
  const cards = page.locator('main ul.grid:visible').first().locator('article');
  await expect(cards).toHaveCount(24);
  for (let i = 0; i < 6 && (await cards.count()) < total; i++) {
    await page.mouse.wheel(0, 20_000);
    await page.waitForTimeout(500);
  }
  await expect(cards).toHaveCount(total);
  await expect(page.getByText(`You’ve seen all ${total} vehicles.`)).toBeVisible();
});
